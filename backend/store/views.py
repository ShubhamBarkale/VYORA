import hmac
import hashlib
import re

import razorpay
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRODUCTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
def get_products(request):
    qs = Product.objects.filter(is_active=True).select_related('category')

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
        qs = qs.filter(price__gte=min_price)
    if max_price:
        qs = qs.filter(price__lte=max_price)

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
    page_size = 20
    page = int(request.query_params.get('page', 1))
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
        product = Product.objects.select_related('category').prefetch_related('reviews__user').get(id=pk, is_active=True)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)


@api_view(['GET'])
def get_categories(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_featured_products(request):
    products = Product.objects.filter(is_active=True, is_featured=True).select_related('category')[:8]
    serializer = ProductSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def get_related_products(request, pk):
    try:
        product = Product.objects.get(id=pk)
        related = Product.objects.filter(
            category=product.category, is_active=True
        ).exclude(id=pk).select_related('category')[:6]
        serializer = ProductSerializer(related, many=True, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CART
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    if product.stock < 1:
        return Response({'error': 'Product is out of stock'}, status=400)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        new_qty = item.quantity + quantity
        if new_qty > product.stock:
            return Response({'error': f'Only {product.stock} units available'}, status=400)
        item.quantity = new_qty
        item.save()
    else:
        if quantity > product.stock:
            return Response({'error': f'Only {product.stock} units available'}, status=400)
        item.quantity = quantity
        item.save()

    serializer = CartSerializer(cart, context={'request': request})
    return Response({'message': 'Product added to cart', 'cart': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_cart_quantity(request):
    item_id = request.data.get('item_id')
    quantity = request.data.get('quantity')
    if not item_id or quantity is None:
        return Response({'error': 'Item ID and quantity are required'}, status=400)
    try:
        item = CartItem.objects.select_related('cart', 'product').get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=404)

    if int(quantity) < 1:
        item.delete()
        return Response({'message': 'Item removed'})

    if int(quantity) > item.product.stock:
        return Response({'error': f'Only {item.product.stock} units available'}, status=400)

    item.quantity = int(quantity)
    item.save()
    return Response(CartItemSerializer(item, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request):
    item_id = request.data.get('item_id')
    CartItem.objects.filter(id=item_id, cart__user=request.user).delete()
    return Response({'message': 'Item removed from cart'})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WISHLIST
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wishlist(request):
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    serializer = WishlistSerializer(wishlist, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_wishlist(request):
    product_id = request.data.get('product_id')
    try:
        product = Product.objects.get(id=product_id)
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
def move_to_cart(request):
    """Move a wishlist product into the cart."""
    product_id = request.data.get('product_id')
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    if product.stock < 1:
        return Response({'error': 'Product is out of stock'}, status=400)

    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    wishlist.products.remove(product)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        item.quantity += 1
        item.save()

    return Response({'message': 'Moved to cart'})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ADDRESSES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def address_list(request):
    if request.method == 'GET':
        addresses = Address.objects.filter(user=request.user)
        return Response(AddressSerializer(addresses, many=True).data)

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
def address_detail(request, pk):
    try:
        address = Address.objects.get(id=pk, user=request.user)
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
        if not data.get(field, '').strip():
            return {'error': f'{field} is required'}, 400

    phone = data.get('shipping_phone', '')
    if not phone.isdigit() or len(phone) < 10:
        return {'error': 'Invalid phone number (must be 10+ digits)'}, 400

    payment_method = data.get('payment_method', 'COD')
    if payment_method not in ['COD', 'RAZORPAY']:
        return {'error': 'Invalid payment method'}, 400
    return None, None


def _calculate_order_totals(cart_items, coupon_code):
    subtotal = sum(item.product.discounted_price * item.quantity for item in cart_items)
    shipping_charge = 0 if subtotal >= 500 else 49
    discount_amount = 0

    if coupon_code:
        try:
            coupon = Coupon.objects.get(code=coupon_code)
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


@transaction.atomic
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    data = request.data
    validation_error = _validate_shipping_data(data)
    if validation_error[0] is not None:
        return Response(validation_error[0], status=validation_error[1])

    payment_method = data.get('payment_method', 'COD')
    cart, _ = Cart.objects.get_or_create(user=request.user)
    cart_items = list(cart.items.select_related('product').all())
    if not cart_items:
        return Response({'error': 'Your cart is empty'}, status=400)

    try:
        subtotal, shipping_charge, discount_amount, total_amount = _calculate_order_totals(
            cart_items,
            data.get('coupon_code', '').strip().upper(),
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    for item in cart_items:
        if item.quantity > item.product.stock:
            return Response({'error': f'Only {item.product.stock} units of "{item.product.name}" available'}, status=400)

    order = Order.objects.create(
        user=request.user,
        shipping_name=data['shipping_name'],
        shipping_phone=data['shipping_phone'],
        shipping_address=data['shipping_address'],
        shipping_city=data['shipping_city'],
        shipping_state=data['shipping_state'],
        shipping_postal_code=data['shipping_postal_code'],
        payment_method=payment_method,
        payment_status='pending',
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_charge=shipping_charge,
        total_amount=total_amount,
        coupon_code=data.get('coupon_code', '').strip().upper(),
        status='pending' if payment_method == 'RAZORPAY' else 'confirmed',
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
        order.payment_status = 'paid'
        order.save(update_fields=['payment_status'])
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

    order.record_status_update('pending', 'Awaiting Razorpay payment confirmation.')
    return Response({
        'message': 'Order created. Please complete payment.',
        'order_number': order.order_number,
        'order_id': order.id,
        'total_amount': str(order.total_amount),
        'payment_method': order.payment_method,
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_orders(request):
    orders = Order.objects.filter(user=request.user).prefetch_related('items', 'status_history')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """Step 1: Create a pending order and return Razorpay metadata."""
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return Response({'error': 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env'}, status=503)

    data = request.data
    validation_error = _validate_shipping_data(data)
    if validation_error[0] is not None:
        return Response(validation_error[0], status=validation_error[1])

    cart, _ = Cart.objects.get_or_create(user=request.user)
    cart_items = list(cart.items.select_related('product').all())
    if not cart_items:
        return Response({'error': 'Your cart is empty'}, status=400)

    try:
        subtotal, shipping_charge, discount_amount, total_amount = _calculate_order_totals(
            cart_items,
            data.get('coupon_code', '').strip().upper(),
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    for item in cart_items:
        if item.quantity > item.product.stock:
            return Response({'error': f'Only {item.product.stock} units of "{item.product.name}" available'}, status=400)

    order = Order.objects.create(
        user=request.user,
        shipping_name=data['shipping_name'],
        shipping_phone=data['shipping_phone'],
        shipping_address=data['shipping_address'],
        shipping_city=data['shipping_city'],
        shipping_state=data['shipping_state'],
        shipping_postal_code=data['shipping_postal_code'],
        payment_method='RAZORPAY',
        payment_status='pending',
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_charge=shipping_charge,
        total_amount=total_amount,
        coupon_code=data.get('coupon_code', '').strip().upper(),
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

    order.record_status_update('pending', 'Awaiting Razorpay payment confirmation.')
    amount_paise = int(float(order.total_amount) * 100)

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
    except Exception as e:
        order.status = 'cancelled'
        order.payment_status = 'failed'
        order.save(update_fields=['status', 'payment_status'])
        order.record_status_update('cancelled', 'Payment initialization failed.')
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_razorpay_payment(request):
    """Step 2: Verify the payment signature on the backend and finalize stock."""
    razorpay_order_id = request.data.get('razorpay_order_id', '')
    razorpay_payment_id = request.data.get('razorpay_payment_id', '')
    razorpay_signature = request.data.get('razorpay_signature', '')

    try:
        order = Order.objects.prefetch_related('items__product').get(razorpay_order_id=razorpay_order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

    if order.payment_status == 'paid':
        return Response({'message': 'Payment already verified.', 'order_number': order.order_number})

    msg = f"{razorpay_order_id}|{razorpay_payment_id}"
    generated_sig = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=msg.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    if generated_sig != razorpay_signature:
        order.payment_status = 'failed'
        order.status = 'cancelled'
        order.save(update_fields=['payment_status', 'status'])
        order.record_status_update('cancelled', 'Payment verification failed.')
        return Response({'error': 'Payment verification failed'}, status=400)

    try:
        with transaction.atomic():
            for item in order.items.select_related('product'):
                if item.quantity > item.product.stock:
                    raise ValueError(f'Only {item.product.stock} units of "{item.product.name}" available')
                item.product.stock -= item.quantity
                item.product.save(update_fields=['stock'])

            order.razorpay_payment_id = razorpay_payment_id
            order.razorpay_signature = razorpay_signature
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.save(update_fields=['razorpay_payment_id', 'razorpay_signature', 'payment_status', 'status'])
            order.record_status_update('confirmed', 'Razorpay payment verified and order confirmed.')

        cart = Cart.objects.filter(user=request.user).first()
        if cart:
            cart.items.all().delete()

        _send_order_confirmation(order)
        return Response({
            'message': 'Payment verified. Order confirmed!',
            'order_number': order.order_number,
        })
    except ValueError as exc:
        order.payment_status = 'failed'
        order.status = 'cancelled'
        order.save(update_fields=['payment_status', 'status'])
        order.record_status_update('cancelled', f'Order could not be finalized: {exc}')
        return Response({'error': str(exc)}, status=400)


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
def create_review(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    if Review.objects.filter(product=product, user=request.user).exists():
        return Response({'error': 'You have already reviewed this product'}, status=400)

    rating = int(request.data.get('rating', 5))
    if not 1 <= rating <= 5:
        return Response({'error': 'Rating must be between 1 and 5'}, status=400)

    review = Review.objects.create(
        product=product,
        user=request.user,
        rating=rating,
        title=request.data.get('title', ''),
        comment=request.data.get('comment', ''),
    )
    return Response(ReviewSerializer(review).data, status=201)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COUPON
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_coupon(request):
    code = request.data.get('code', '').strip().upper()
    order_total = request.data.get('order_total', 0)

    try:
        coupon = Coupon.objects.get(code=code)
    except Coupon.DoesNotExist:
        return Response({'valid': False, 'error': 'Coupon not found'}, status=404)

    if not coupon.is_valid:
        return Response({'valid': False, 'error': 'Coupon is expired or inactive'}, status=400)

    if float(order_total) < float(coupon.min_order_amount):
        return Response({
            'valid': False,
            'error': f'Minimum order ₹{coupon.min_order_amount} required'
        }, status=400)

    discount = coupon.calculate_discount(float(order_total))
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
    """Recommend real products from the catalog based on a user's shopping query."""
    message = (request.data.get('message') or request.data.get('query') or '').strip()
    budget = request.data.get('budget')
    category_slug = (request.data.get('category') or '').strip()
    limit = int(request.data.get('limit', 3) or 3)
    limit = max(1, min(6, limit))

    qs = Product.objects.filter(is_active=True).select_related('category')
    if category_slug:
        qs = qs.filter(category__slug=category_slug)

    if budget is not None and str(budget).strip():
        try:
            budget_value = float(budget)
            qs = qs.filter(price__lte=budget_value)
        except ValueError:
            budget_value = None
    else:
        budget_value = None

    extracted_budget = None
    if not budget_value and message:
        matches = re.findall(r'\d{3,7}', message)
        if matches:
            extracted_budget = min(float(num) for num in matches)
            qs = qs.filter(price__lte=extracted_budget)

    if message:
        tokens = [token.lower() for token in re.split(r'[^a-zA-Z0-9]+', message) if len(token) > 2]
        if tokens:
            filters = Q()
            for token in tokens:
                filters |= Q(name__icontains=token) | Q(description__icontains=token) | Q(specifications__icontains=token) | Q(category__name__icontains=token)
            qs = qs.filter(filters)

    if not qs.exists():
        qs = Product.objects.filter(is_active=True).select_related('category')

    qs = qs.order_by('-is_featured', '-created_at')
    products = list(qs[:limit])
    if not products:
        products = list(Product.objects.filter(is_active=True).select_related('category')[:limit])

    serializer = ProductSerializer(products, many=True, context={'request': request})
    budget_text = budget_value or extracted_budget
    assistant_reply = f"Based on your request, I found {len(serializer.data)} product option(s)"
    if message:
        assistant_reply += f" for: '{message}'"
    if budget_text:
        assistant_reply += f" within ₹{int(budget_text):,}."
    else:
        assistant_reply += "."

    return Response({
        'assistant_reply': assistant_reply,
        'budget': budget_text,
        'recommendations': serializer.data,
    })


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
    serializer = ChangePasswordSerializer(data=request.data)
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
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email is required'}, status=400)

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

    if not all([uid_b64, token, new_password, new_password2]):
        return Response({'error': 'All fields are required'}, status=400)

    if new_password != new_password2:
        return Response({'error': 'Passwords do not match'}, status=400)

    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, User.DoesNotExist):
        return Response({'error': 'Invalid reset link'}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Reset link is invalid or has expired'}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password reset successfully. You can now log in.'})
