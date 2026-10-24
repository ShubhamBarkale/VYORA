import hmac
import hashlib
import logging
import re
from datetime import timedelta
from decimal import Decimal, InvalidOperation

import razorpay
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Avg, Count, F, IntegerField, OuterRef, Prefetch, Q, Subquery, Sum
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import serializers, status

from .models import (
    Product, Category, Cart, CartItem,
    UserProfile, Address, Order, OrderStatusUpdate, OrderItem,
    Wishlist, Review, Coupon
)
from .serializers import (
    ProductSerializer, CategorySerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, OrderItemSerializer, OrderStatusUpdateSerializer,
    UserSerializer, RegisterSerializer,
    UpdateProfileSerializer, ChangePasswordSerializer,
    AddressSerializer, WishlistSerializer,
    ReviewSerializer, CouponSerializer,
)
from .ai_assistant import build_assistant_result


logger = logging.getLogger(__name__)
INVENTORY_RESERVATION_MINUTES = 15


def _is_demo_payment_mode():
    return settings.DEBUG and not bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=1000, default=1)


class CartQuantitySerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=0, max_value=1000)


class ProductIdSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)


class CartItemIdSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1)


class ReviewInputSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, default=5)
    title = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')


def _product_queryset():
    reserved_quantity = (
        OrderItem.objects.filter(
            product_id=OuterRef('pk'),
            order__inventory_reserved=True,
            order__reservation_expires_at__gt=timezone.now(),
        )
        .order_by()
        .values('product_id')
        .annotate(total=Sum('quantity'))
        .values('total')[:1]
    )
    return Product.objects.select_related('category').annotate(
        _average_rating=Avg('reviews__rating'),
        _review_count=Count('reviews', distinct=True),
        _reserved_quantity=Subquery(reserved_quantity, output_field=IntegerField()),
    )


def _positive_price(value, field_name):
    try:
        price = Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f'{field_name} must be a valid amount.')
    if not price.is_finite() or price < 0:
        raise ValueError(f'{field_name} must be a non-negative amount.')
    return price


def _available_stock(product, exclude_order_id=None):
    reservations = OrderItem.objects.filter(
        product_id=product.pk,
        order__inventory_reserved=True,
        order__reservation_expires_at__gt=timezone.now(),
    )
    if exclude_order_id is not None:
        reservations = reservations.exclude(order_id=exclude_order_id)
    reserved_quantity = reservations.aggregate(total=Sum('quantity'))['total'] or 0
    return max(product.stock - reserved_quantity, 0)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRODUCTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
def get_products(request):
    qs = _product_queryset().filter(is_active=True)

    # Search
    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(category__name__icontains=search)
        )

    # Filter by category slug
    category = request.query_params.get('category', '').strip()
    if category:
        qs = qs.filter(category__slug=category)

    # Filter by availability
    in_stock = request.query_params.get('in_stock', '').strip()
    if in_stock == 'true':
        qs = qs.filter(stock__gt=0)

    # Filter by price range
    min_price = request.query_params.get('min_price', '').strip()
    max_price = request.query_params.get('max_price', '').strip()
    if min_price:
        try:
            min_price = _positive_price(min_price, 'min_price')
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        qs = qs.filter(price__gte=min_price)
    if max_price:
        try:
            max_price = _positive_price(max_price, 'max_price')
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        qs = qs.filter(price__lte=max_price)
    if min_price and max_price and min_price > max_price:
        return Response({'error': 'min_price cannot be greater than max_price.'}, status=400)

    # Sorting
    sort = request.query_params.get('sort', '').strip()
    if sort == 'price_asc':
        qs = qs.order_by('price')
    elif sort == 'price_desc':
        qs = qs.order_by('-price')
    elif sort == 'newest':
        qs = qs.order_by('-created_at')
    elif sort == 'featured':
        qs = qs.order_by('-is_featured', '-created_at')
    else:
        qs = qs.order_by('-created_at')

    # Pagination
    try:
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
    except (TypeError, ValueError):
        return Response({'error': 'page and page_size must be integers.'}, status=400)
    if page < 1 or page_size < 1 or page_size > 100:
        return Response({'error': 'page must be positive and page_size must be between 1 and 100.'}, status=400)
    total = qs.count()
    start = (page - 1) * page_size
    products = qs[start: start + page_size]

    serializer = ProductSerializer(products, many=True, context={'request': request})
    return Response({
        'results': serializer.data,
        'count': total,
        'page': page,
        'total_pages': (total + page_size - 1) // page_size,
    })


@api_view(['GET'])
def get_product(request, pk):
    try:
        product = _product_queryset().prefetch_related('reviews__user').get(id=pk, is_active=True)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)


@api_view(['GET'])
def get_categories(request):
    categories = Category.objects.annotate(
        _product_count=Count('products', filter=Q(products__is_active=True), distinct=True)
    )
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_featured_products(request):
    products = _product_queryset().filter(is_active=True, is_featured=True)[:8]
    serializer = ProductSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def get_related_products(request, pk):
    try:
        product = Product.objects.get(id=pk)
        related = _product_queryset().filter(
            category=product.category, is_active=True
        ).exclude(id=pk)[:6]
        serializer = ProductSerializer(related, many=True, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CART
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def get_cart(request):
    User.objects.select_for_update().get(pk=request.user.pk)
    cart, _ = Cart.objects.get_or_create(user=request.user)
    cart = Cart.objects.prefetch_related(
        Prefetch('items__product', queryset=_product_queryset())
    ).get(pk=cart.pk)
    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def add_to_cart(request):
    input_serializer = CartAddSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    product_id = input_serializer.validated_data['product_id']
    quantity = input_serializer.validated_data['quantity']
    User.objects.select_for_update().get(pk=request.user.pk)
    try:
        product = Product.objects.select_for_update().get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    available_stock = _available_stock(product)
    if available_stock < 1:
        return Response({'error': 'Product is out of stock'}, status=400)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
    new_quantity = quantity + (item.quantity if item else 0)
    if new_quantity > available_stock:
        return Response({'error': f'Only {available_stock} units available'}, status=400)
    if new_quantity > 1000:
        return Response({'error': 'Cart quantity cannot exceed 1000 units.'}, status=400)
    if item:
        item.quantity = new_quantity
        item.save(update_fields=['quantity'])
    else:
        CartItem.objects.create(cart=cart, product=product, quantity=new_quantity)

    cart = Cart.objects.prefetch_related(
        Prefetch('items__product', queryset=_product_queryset())
    ).get(pk=cart.pk)
    serializer = CartSerializer(cart, context={'request': request})
    return Response({'message': 'Product added to cart', 'cart': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_cart_quantity(request):
    input_serializer = CartQuantitySerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    item_id = input_serializer.validated_data['item_id']
    quantity = input_serializer.validated_data['quantity']
    User.objects.select_for_update().get(pk=request.user.pk)
    try:
        item = CartItem.objects.select_for_update().get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=404)
    product = Product.objects.select_for_update().get(pk=item.product_id)

    if quantity < 1:
        item.delete()
        return Response({'message': 'Item removed'})

    available_stock = _available_stock(product)
    if quantity > available_stock:
        return Response({'error': f'Only {available_stock} units available'}, status=400)

    item.quantity = quantity
    item.save()
    item.product = product
    return Response(CartItemSerializer(item, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def remove_from_cart(request):
    input_serializer = CartItemIdSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    User.objects.select_for_update().get(pk=request.user.pk)
    item_id = input_serializer.validated_data['item_id']
    CartItem.objects.filter(id=item_id, cart__user=request.user).delete()
    return Response({'message': 'Item removed from cart'})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WISHLIST
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def get_wishlist(request):
    User.objects.select_for_update().get(pk=request.user.pk)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    wishlist = Wishlist.objects.prefetch_related(
        Prefetch('products', queryset=_product_queryset())
    ).get(pk=wishlist.pk)
    serializer = WishlistSerializer(wishlist, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def toggle_wishlist(request):
    input_serializer = ProductIdSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    User.objects.select_for_update().get(pk=request.user.pk)
    product_id = input_serializer.validated_data['product_id']
    try:
        product = Product.objects.select_for_update().get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    if product in wishlist.products.all():
        wishlist.products.remove(product)
        return Response({'message': 'Removed from wishlist', 'in_wishlist': False})
    else:
        wishlist.products.add(product)
        return Response({'message': 'Added to wishlist', 'in_wishlist': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def move_to_cart(request):
    """Move a wishlist product into the cart."""
    input_serializer = ProductIdSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)
    User.objects.select_for_update().get(pk=request.user.pk)
    product_id = input_serializer.validated_data['product_id']
    try:
        product = Product.objects.select_for_update().get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    available_stock = _available_stock(product)
    if available_stock < 1:
        return Response({'error': 'Product is out of stock'}, status=400)

    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    wishlist.products.remove(product)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
    new_quantity = item.quantity + 1 if item else 1
    if new_quantity > available_stock:
        return Response({'error': f'Only {available_stock} units available'}, status=400)
    if item:
        item.quantity = new_quantity
        item.save(update_fields=['quantity'])
    else:
        CartItem.objects.create(cart=cart, product=product, quantity=1)

    return Response({'message': 'Moved to cart'})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ADDRESSES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def address_list(request):
    if request.method == 'GET':
        addresses = Address.objects.filter(user=request.user)
        return Response(AddressSerializer(addresses, many=True).data)

    User.objects.select_for_update().get(pk=request.user.pk)
    serializer = AddressSerializer(data=request.data)
    if serializer.is_valid():
        # If this is set as default, unset others
        if request.data.get('is_default'):
            Address.objects.filter(user=request.user).update(is_default=False)
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def address_detail(request, pk):
    User.objects.select_for_update().get(pk=request.user.pk)
    try:
        address = Address.objects.select_for_update().get(id=pk, user=request.user)
    except Address.DoesNotExist:
        return Response({'error': 'Address not found'}, status=404)

    if request.method == 'DELETE':
        address.delete()
        return Response({'message': 'Address deleted'})

    serializer = AddressSerializer(address, data=request.data, partial=True)
    if serializer.is_valid():
        if request.data.get('is_default'):
            Address.objects.filter(user=request.user).update(is_default=False)
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ORDERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _send_order_confirmation(order):
    """Send order confirmation email (non-blocking)."""
    try:
        items_text = '\n'.join(
            f"  • {item.product_name} × {item.quantity} @ ₹{item.price}"
            for item in order.items.all()
        )
        message = (
            f"Hi {order.user.first_name or order.user.username},\n\n"
            f"Your order has been placed successfully! 🎉\n\n"
            f"Order Number: {order.order_number}\n"
            f"Order Status: {order.get_status_display()}\n"
            f"Payment Method: {order.get_payment_method_display()}\n\n"
            f"Items Ordered:\n{items_text}\n\n"
            f"Subtotal: ₹{order.subtotal}\n"
            f"Discount: ₹{order.discount_amount}\n"
            f"Shipping: ₹{order.shipping_charge}\n"
            f"Total: ₹{order.total_amount}\n\n"
            f"Shipping to:\n{order.shipping_name}\n{order.shipping_address}\n"
            f"{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}\n\n"
            f"Thank you for shopping with ShubhamCart!\n"
            f"{settings.FRONTEND_URL}/orders/{order.order_number}"
        )
        send_mail(
            subject=f"Order Confirmed – {order.order_number} | ShubhamCart",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.user.email],
            fail_silently=True,
        )
    except Exception:
        pass


def _validate_shipping_data(data):
    required = ['shipping_name', 'shipping_phone', 'shipping_address', 'shipping_city', 'shipping_state', 'shipping_postal_code']
    for field in required:
        value = data.get(field, '')
        if not isinstance(value, str) or not value.strip():
            return {'error': f'{field} is required'}, 400

    max_lengths = {
        'shipping_name': 100,
        'shipping_phone': 15,
        'shipping_city': 100,
        'shipping_state': 100,
        'shipping_postal_code': 10,
    }
    for field, max_length in max_lengths.items():
        if len(data[field].strip()) > max_length:
            return {'error': f'{field} must be {max_length} characters or fewer.'}, 400

    phone = data['shipping_phone'].strip()
    if not phone.isdigit() or not 10 <= len(phone) <= 15:
        return {'error': 'Invalid phone number (must be 10-15 digits)'}, 400

    payment_method = data.get('payment_method', 'COD')
    if payment_method not in ['COD', 'RAZORPAY']:
        return {'error': 'Invalid payment method'}, 400
    coupon_code = data.get('coupon_code', '')
    if not isinstance(coupon_code, str) or len(coupon_code) > 30:
        return {'error': 'Invalid coupon code.'}, 400
    return None, None


def _calculate_order_totals(cart_items, coupon_code):
    subtotal = sum(item.product.discounted_price * item.quantity for item in cart_items)
    shipping_charge = 0 if subtotal >= 500 else 49
    discount_amount = 0

    if coupon_code:
        try:
            coupon = Coupon.objects.select_for_update().get(code=coupon_code)
        except Coupon.DoesNotExist:
            raise ValueError('Invalid coupon code')

        if not coupon.is_valid:
            raise ValueError('Coupon is expired or invalid')
        if subtotal < coupon.min_order_amount:
            raise ValueError(f'Minimum order ₹{coupon.min_order_amount} required for this coupon')

        discount_amount = coupon.calculate_discount(subtotal)
        coupon.used_count += 1
        coupon.save(update_fields=['used_count'])

    total_amount = subtotal - discount_amount + shipping_charge
    return subtotal, shipping_charge, discount_amount, total_amount


def _locked_cart_items(user):
    User.objects.select_for_update().get(pk=user.pk)
    cart = Cart.objects.select_for_update().filter(user=user).order_by('pk').first()
    if cart is None:
        cart = Cart.objects.create(user=user)
    items = list(
        CartItem.objects.select_for_update()
        .filter(cart=cart)
        .select_related('product')
        .order_by('product_id')
    )
    if not items:
        return cart, items

    products = Product.objects.select_for_update().filter(
        pk__in=[item.product_id for item in items]
    ).order_by('pk')
    product_by_id = {product.pk: product for product in products}
    for item in items:
        item.product = product_by_id[item.product_id]
    return cart, items


def _validate_locked_stock(cart_items, exclude_order_id=None):
    for item in cart_items:
        if not item.product.is_active:
            return f'"{item.product.name}" is no longer available.'
        available_stock = _available_stock(item.product, exclude_order_id)
        if item.quantity > available_stock:
            return f'Only {available_stock} units of "{item.product.name}" available'
    return None


def _remove_ordered_cart_items(user, order_items):
    cart = Cart.objects.filter(user=user).order_by('pk').first()
    if cart is None:
        return
    for order_item in order_items:
        CartItem.objects.filter(
            cart=cart,
            product_id=order_item.product_id,
            quantity=order_item.quantity,
        ).delete()


@transaction.atomic
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    data = request.data
    validation_error = _validate_shipping_data(data)
    if validation_error[0] is not None:
        return Response(validation_error[0], status=validation_error[1])

    payment_method = data.get('payment_method', 'COD')
    if payment_method == 'RAZORPAY':
        return Response({
            'error': 'Use the online payment endpoint to create a Razorpay order.'
        }, status=400)
    cart, cart_items = _locked_cart_items(request.user)
    if not cart_items:
        return Response({'error': 'Your cart is empty'}, status=400)
    stock_error = _validate_locked_stock(cart_items)
    if stock_error:
        return Response({'error': stock_error}, status=400)

    coupon_code = data.get('coupon_code', '').strip().upper()
    try:
        subtotal, shipping_charge, discount_amount, total_amount = _calculate_order_totals(
            cart_items,
            coupon_code,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    order = Order.objects.create(
        user=request.user,
        shipping_name=data['shipping_name'].strip(),
        shipping_phone=data['shipping_phone'].strip(),
        shipping_address=data['shipping_address'].strip(),
        shipping_city=data['shipping_city'].strip(),
        shipping_state=data['shipping_state'].strip(),
        shipping_postal_code=data['shipping_postal_code'].strip(),
        payment_method=payment_method,
        payment_status='pending',
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_charge=shipping_charge,
        total_amount=total_amount,
        coupon_code=coupon_code,
        status='confirmed',
    )

    for item in cart_items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name=item.product.name,
            product_image=item.product.image.url if item.product.image else '',
            quantity=item.quantity,
            price=item.product.discounted_price,
        )

    if payment_method == 'COD':
        for item in cart_items:
            item.product.stock -= item.quantity
            item.product.save(update_fields=['stock'])
        order.record_status_update('confirmed', 'Cash on delivery order confirmed.')
        cart.items.all().delete()
        _send_order_confirmation(order)
        return Response({
            'message': 'Order placed successfully',
            'order_number': order.order_number,
            'order_id': order.id,
            'total_amount': str(order.total_amount),
            'payment_method': order.payment_method,
        }, status=201)

    return Response({
        'error': 'Use the online payment endpoint to create a Razorpay order.'
    }, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_orders(request):
    orders = Order.objects.filter(user=request.user).prefetch_related('items', 'status_history')
    try:
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
    except (TypeError, ValueError):
        return Response({'error': 'page and page_size must be integers.'}, status=400)
    if page < 1 or not 1 <= page_size <= 100:
        return Response({'error': 'page must be positive and page_size must be between 1 and 100.'}, status=400)
    total = orders.count()
    total_pages = (total + page_size - 1) // page_size
    orders = orders[(page - 1) * page_size:page * page_size]
    serializer = OrderSerializer(orders, many=True)
    return Response({
        'results': serializer.data,
        'count': total,
        'page': page,
        'total_pages': total_pages,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_detail(request, order_number):
    try:
        order = Order.objects.prefetch_related('items', 'status_history').get(
            order_number=order_number, user=request.user
        )
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RAZORPAY PAYMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@transaction.atomic
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """Step 1: Create a pending order and return Razorpay metadata.

    In demo mode, this returns a safe mock payment payload so the portfolio app can
    test the checkout flow without real third-party secrets or paid APIs.
    """
    data = request.data
    validation_error = _validate_shipping_data(data)
    if validation_error[0] is not None:
        return Response(validation_error[0], status=validation_error[1])

    if not _is_demo_payment_mode() and not (
        settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET
    ):
        return Response({'error': 'Online payments are not configured.'}, status=503)

    cart, cart_items = _locked_cart_items(request.user)
    if not cart_items:
        return Response({'error': 'Your cart is empty'}, status=400)
    stock_error = _validate_locked_stock(cart_items)
    if stock_error:
        return Response({'error': stock_error}, status=400)

    coupon_code = data.get('coupon_code', '').strip().upper()
    try:
        subtotal, shipping_charge, discount_amount, total_amount = _calculate_order_totals(
            cart_items,
            coupon_code,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    order = Order.objects.create(
        user=request.user,
        shipping_name=data['shipping_name'].strip(),
        shipping_phone=data['shipping_phone'].strip(),
        shipping_address=data['shipping_address'].strip(),
        shipping_city=data['shipping_city'].strip(),
        shipping_state=data['shipping_state'].strip(),
        shipping_postal_code=data['shipping_postal_code'].strip(),
        payment_method='RAZORPAY',
        payment_status='pending',
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_charge=shipping_charge,
        total_amount=total_amount,
        coupon_code=coupon_code,
        status='pending',
    )

    for item in cart_items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name=item.product.name,
            product_image=item.product.image.url if item.product.image else '',
            quantity=item.quantity,
            price=item.product.discounted_price,
        )

    order.inventory_reserved = True
    order.reservation_expires_at = timezone.now() + timedelta(
        minutes=INVENTORY_RESERVATION_MINUTES
    )
    order.save(update_fields=['inventory_reserved', 'reservation_expires_at'])
    order.record_status_update('pending', 'Awaiting payment confirmation.')
    amount_paise = int(order.total_amount * 100)

    if _is_demo_payment_mode():
        order.razorpay_order_id = f'demo_{order.order_number}'
        order.save(update_fields=['razorpay_order_id'])
        return Response({
            'demo_mode': True,
            'razorpay_order_id': order.razorpay_order_id,
            'amount': amount_paise,
            'currency': 'INR',
            'order_number': order.order_number,
            'key_id': 'demo_key',
            'message': 'Demo payment mode is active. Confirm the payment to simulate a successful checkout.',
        })

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rz_order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': order.order_number,
            'notes': {'user_id': request.user.id},
        })
        order.razorpay_order_id = rz_order['id']
        order.save(update_fields=['razorpay_order_id'])
        return Response({
            'razorpay_order_id': rz_order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'order_number': order.order_number,
            'key_id': settings.RAZORPAY_KEY_ID,
        })
    except Exception:
        logger.exception('Razorpay order initialization failed for order %s', order.order_number)
        if coupon_code:
            Coupon.objects.filter(code=coupon_code, used_count__gt=0).update(
                used_count=F('used_count') - 1
            )
        order.status = 'cancelled'
        order.payment_status = 'failed'
        order.inventory_reserved = False
        order.reservation_expires_at = None
        order.save(update_fields=[
            'status', 'payment_status', 'inventory_reserved', 'reservation_expires_at',
        ])
        order.record_status_update('cancelled', 'Payment initialization failed.')
        return Response({'error': 'Payment initialization failed.'}, status=502)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_razorpay_payment(request):
    """Verify payment with Razorpay, then atomically finalize inventory and order state."""
    razorpay_order_id = request.data.get('razorpay_order_id', '')
    razorpay_payment_id = request.data.get('razorpay_payment_id', '')
    razorpay_signature = request.data.get('razorpay_signature', '')
    if not all(
        isinstance(value, str) and value and len(value) <= max_length
        for value, max_length in (
            (razorpay_order_id, 100),
            (razorpay_payment_id, 100),
            (razorpay_signature, 200),
        )
    ):
        return Response({'error': 'Payment verification data is invalid.'}, status=400)

    try:
        order = Order.objects.get(razorpay_order_id=razorpay_order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

    if order.payment_method != 'RAZORPAY':
        return Response({'error': 'This order is not payable with Razorpay.'}, status=400)
    if order.payment_status == 'paid':
        return Response({'message': 'Payment already verified.', 'order_number': order.order_number})
    if order.status == 'cancelled':
        return Response({'error': 'This order can no longer be paid.'}, status=400)

    demo_payment = _is_demo_payment_mode()
    if demo_payment:
        if (
            razorpay_order_id != f'demo_{order.order_number}'
            or not razorpay_payment_id.startswith('demo_')
            or not razorpay_signature.startswith('demo_signature_')
        ):
            return Response({'error': 'Payment verification failed.'}, status=400)
    else:
        if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
            return Response({'error': 'Online payments are not configured.'}, status=503)
        message = f'{razorpay_order_id}|{razorpay_payment_id}'
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(generated_signature, razorpay_signature):
            return Response({'error': 'Payment verification failed.'}, status=400)

    try:
        with transaction.atomic():
            User.objects.select_for_update().get(pk=request.user.pk)
            order = Order.objects.select_for_update().get(pk=order.pk, user=request.user)
            if order.payment_status == 'paid':
                return Response({
                    'message': 'Payment already verified.',
                    'order_number': order.order_number,
                })
            if order.inventory_reserved and (
                order.reservation_expires_at is None
                or order.reservation_expires_at <= timezone.now()
            ):
                raise ValueError('The payment session expired. Please start checkout again.')

            order_items = list(order.items.select_related('product').order_by('product_id'))
            products = Product.objects.select_for_update().filter(
                pk__in=[item.product_id for item in order_items if item.product_id]
            ).order_by('pk')
            product_by_id = {product.pk: product for product in products}
            for item in order_items:
                product = product_by_id.get(item.product_id)
                if product is None or not product.is_active:
                    raise ValueError(f'"{item.product_name}" is no longer available.')
                available_stock = _available_stock(product, exclude_order_id=order.pk)
                if item.quantity > available_stock:
                    raise ValueError(f'Only {available_stock} units of "{item.product_name}" available')

            if not demo_payment:
                client = razorpay.Client(auth=(
                    settings.RAZORPAY_KEY_ID,
                    settings.RAZORPAY_KEY_SECRET,
                ))
                payment = client.payment.fetch(razorpay_payment_id)
                expected_amount = int(order.total_amount * 100)
                if (
                    payment.get('order_id') != razorpay_order_id
                    or payment.get('amount') != expected_amount
                    or payment.get('currency') != 'INR'
                ):
                    return Response({'error': 'Payment details do not match this order.'}, status=400)
                if payment.get('status') == 'authorized':
                    payment = client.payment.capture(
                        razorpay_payment_id,
                        expected_amount,
                        {'currency': 'INR'},
                    )
                if payment.get('status') != 'captured':
                    return Response({'error': 'Payment has not been captured.'}, status=400)

            for product in product_by_id.values():
                quantity = sum(
                    item.quantity for item in order_items if item.product_id == product.pk
                )
                product.stock -= quantity
                product.save(update_fields=['stock'])

            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.inventory_reserved = False
            order.reservation_expires_at = None
            order.save(update_fields=[
                'razorpay_payment_id', 'razorpay_signature',
                'payment_status', 'status', 'inventory_reserved',
                'reservation_expires_at', 'updated_at',
            ])
            note = (
                'Demo payment verified. This is a local test order.'
                if demo_payment
                else 'Razorpay payment verified and captured.'
            )
            order.record_status_update('confirmed', note)
            _remove_ordered_cart_items(request.user, order_items)

        _send_order_confirmation(order)
        response = {
            'message': 'Demo payment verified. Order confirmed!'
            if demo_payment else 'Payment verified. Order confirmed!',
            'order_number': order.order_number,
        }
        if demo_payment:
            response['demo_mode'] = True
        return Response(response)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    except Exception:
        logger.exception('Razorpay payment verification failed for order %s', order.order_number)
        return Response({'error': 'Payment could not be verified. Please contact support.'}, status=502)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REVIEWS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
def get_product_reviews(request, pk):
    reviews = Review.objects.filter(product_id=pk).select_related('user')
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_review(request, pk):
    User.objects.select_for_update().get(pk=request.user.pk)
    try:
        product = Product.objects.select_for_update().get(id=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    input_serializer = ReviewInputSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=400)

    if Review.objects.filter(product=product, user=request.user).exists():
        return Response({'error': 'You have already reviewed this product'}, status=400)

    review = Review.objects.create(
        product=product,
        user=request.user,
        **input_serializer.validated_data,
    )
    return Response(ReviewSerializer(review).data, status=201)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COUPON
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_coupon(request):
    code = request.data.get('code', '')
    if not isinstance(code, str) or not code.strip() or len(code) > 30:
        return Response({'valid': False, 'error': 'Enter a valid coupon code.'}, status=400)
    cart = Cart.objects.filter(user=request.user).order_by('pk').first()
    cart_items = cart.items.select_related('product').all() if cart else []
    order_total = sum(
        item.product.discounted_price * item.quantity
        for item in cart_items
    )

    try:
        coupon = Coupon.objects.get(code=code.strip().upper())
    except Coupon.DoesNotExist:
        return Response({'valid': False, 'error': 'Coupon not found'}, status=404)

    if not coupon.is_valid:
        return Response({'valid': False, 'error': 'Coupon is expired or inactive'}, status=400)

    if order_total < coupon.min_order_amount:
        return Response({
            'valid': False,
            'error': f'Minimum order ₹{coupon.min_order_amount} required'
        }, status=400)

    discount = coupon.calculate_discount(order_total)
    return Response({
        'valid': True,
        'code': coupon.code,
        'discount_type': coupon.discount_type,
        'discount_value': str(coupon.discount_value),
        'discount_amount': str(discount),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_shopping_assistant(request):
    message = request.data.get('message', request.data.get('query', ''))
    action = request.data.get('action', '')
    product_ids = request.data.get('product_ids', [])
    if request.data.get('product_id') is not None and not product_ids:
        product_ids = [request.data.get('product_id')]

    if not isinstance(message, str) or len(message) > 1000:
        return Response({'error': 'Message must be text up to 1000 characters.'}, status=400)
    if not isinstance(action, str) or action not in {
        '', 'search', 'recommend', 'compare', 'reviews', 'order_tracking',
    }:
        return Response({'error': 'Unsupported assistant action.'}, status=400)
    if not isinstance(product_ids, list) or len(product_ids) > 3:
        return Response({'error': 'Select up to three catalog products.'}, status=400)

    try:
        limit = int(request.data.get('limit', 4))
    except (TypeError, ValueError):
        return Response({'error': 'Limit must be a whole number.'}, status=400)
    if not 1 <= limit <= 6:
        return Response({'error': 'Limit must be between 1 and 6.'}, status=400)

    order_number = request.data.get('order_number', '')
    if not isinstance(order_number, str) or len(order_number) > 20:
        return Response({'error': 'Enter a valid order number.'}, status=400)

    try:
        result = build_assistant_result(
            message=message.strip(),
            user=request.user,
            action=action,
            budget=request.data.get('budget'),
            product_ids=product_ids,
            order_number=order_number,
            limit=limit,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    data = result['data']
    recommendations = data.get('recommendations')
    if recommendations is not None:
        serialized = ProductSerializer(
            recommendations, many=True, context={'request': request},
        ).data
        data['recommendations'] = serialized
        if data.get('comparison') is not None:
            data['comparison'] = serialized[:2]
    return Response(data, status=result['status'])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH / USER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Send welcome email
        try:
            send_mail(
                subject='Welcome to ShubhamCart! 🎉',
                message=(
                    f"Hi {user.first_name or user.username},\n\n"
                    "Welcome to ShubhamCart! Your account has been created successfully.\n\n"
                    f"Username: {user.username}\n"
                    f"Email: {user.email}\n\n"
                    "Start shopping now: " + settings.FRONTEND_URL
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
        return Response({
            "message": "Account created successfully",
            "user": UserSerializer(user).data
        }, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    serializer = UpdateProfileSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    user = request.user

    # Check email uniqueness if changing
    new_email = data.get('email')
    if new_email and new_email != user.email:
        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
            return Response({'email': 'Email already in use'}, status=400)
        user.email = new_email

    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    user.save()

    # Update profile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if 'phone' in data:
        profile.phone = data['phone']
    profile.save()

    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'user': request.user})
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': 'Incorrect current password'}, status=400)

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'message': 'Password changed successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send a password-reset link to the user's email."""
    email = request.data.get('email', '')
    if not isinstance(email, str) or not email.strip():
        return Response({'error': 'Email is required'}, status=400)
    email = email.strip()

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Return 200 even if not found — security best practice (don't leak whether email exists)
        return Response({'message': 'If this email is registered, a reset link has been sent.'})

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    try:
        send_mail(
            subject='Reset Your ShubhamCart Password',
            message=(
                f"Hi {user.first_name or user.username},\n\n"
                "You requested a password reset for your ShubhamCart account.\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                "This link is valid for 24 hours. If you didn't request this, ignore this email.\n\n"
                "— ShubhamCart Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        return Response({'error': 'Failed to send email. Please try again.'}, status=500)

    return Response({'message': 'If this email is registered, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Validate the token and set a new password."""
    uid_b64 = request.data.get('uid', '')
    token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')
    new_password2 = request.data.get('new_password2', '')

    if not all(isinstance(value, str) and value for value in (
        uid_b64, token, new_password, new_password2
    )):
        return Response({'error': 'All fields are required'}, status=400)

    if new_password != new_password2:
        return Response({'error': 'Passwords do not match'}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, User.DoesNotExist):
        return Response({'error': 'Invalid reset link'}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Reset link is invalid or has expired'}, status=400)

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({'new_password': exc.messages}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password reset successfully. You can now log in.'})
