from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    Product, Category, Cart, CartItem,
    UserProfile, Address, Order, OrderStatusUpdate, OrderItem,
    Wishlist, Review, Coupon
)
from django.contrib.auth.models import User


# ── Category ──────────────────────────────────────────────────────────────────
class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'description', 'product_count']

    def get_product_count(self, obj):
        if hasattr(obj, '_product_count'):
            return obj._product_count
        return obj.products.filter(is_active=True).count()


# ── Product ───────────────────────────────────────────────────────────────────
class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False
    )
    discounted_price = serializers.ReadOnlyField()
    stock = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_id', 'name', 'description', 'specifications',
            'price', 'discount_percent', 'discounted_price',
            'stock', 'in_stock', 'image', 'image_url', 'external_image_url',
            'is_featured', 'is_active',
            'average_rating', 'review_count',
            'created_at',
        ]
        extra_kwargs = {'image': {'required': False}}

    def get_image_url(self, obj):
        """
        Priority: local ImageField → external_image_url → None
        Never prefix an external URL with the media root.
        """
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        if obj.external_image_url:
            return obj.external_image_url   # return as-is — already a full URL
        return None

    def get_average_rating(self, obj):
        if hasattr(obj, '_average_rating'):
            return obj._average_rating or 0
        return obj.average_rating

    def get_review_count(self, obj):
        if hasattr(obj, '_review_count'):
            return obj._review_count
        return obj.review_count

    def get_stock(self, obj):
        if hasattr(obj, '_reserved_quantity'):
            return max(obj.stock - (obj._reserved_quantity or 0), 0)
        return obj.available_stock

    def get_in_stock(self, obj):
        return self.get_stock(obj) > 0


# ── Cart ──────────────────────────────────────────────────────────────────────
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_discounted_price = serializers.DecimalField(
        source='product.discounted_price', max_digits=10, decimal_places=2, read_only=True
    )
    product_image = serializers.SerializerMethodField()
    product_discount_percent = serializers.IntegerField(source='product.discount_percent', read_only=True)
    product_stock = serializers.SerializerMethodField()
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'product_discounted_price', 'product_discount_percent',
            'product_image', 'product_stock', 'quantity', 'subtotal',
        ]

    def get_product_image(self, obj):
        """Same priority as ProductSerializer: local image → external URL → None. Never prefix external URLs."""
        request = self.context.get('request')
        if obj.product.image:
            if request:
                return request.build_absolute_uri(obj.product.image.url)
            return obj.product.image.url
        if obj.product.external_image_url:
            return obj.product.external_image_url
        return None

    def get_product_stock(self, obj):
        if hasattr(obj.product, '_reserved_quantity'):
            return max(obj.product.stock - (obj.product._reserved_quantity or 0), 0)
        return obj.product.available_stock


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'item_count']


# ── Order ─────────────────────────────────────────────────────────────────────
class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'quantity', 'price', 'subtotal']


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusUpdate
        fields = ['status', 'note', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_method', 'payment_status',
            'shipping_name', 'shipping_phone', 'shipping_address',
            'shipping_city', 'shipping_state', 'shipping_postal_code',
            'subtotal', 'discount_amount', 'shipping_charge', 'total_amount',
            'coupon_code', 'items', 'status_history', 'created_at', 'updated_at',
        ]


# ── User / Auth ───────────────────────────────────────────────────────────────
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'avatar']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')
    phone = serializers.CharField(max_length=15, required=False, default='')
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        user = User(
            username=data['username'],
            email=data['email'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )
        try:
            validate_password(data['password'], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages})
        return data

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user, phone=phone)
        return user


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=15, required=False)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        try:
            validate_password(data['new_password'], user=self.context.get('user'))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': exc.messages})
        return data


# ── Address ───────────────────────────────────────────────────────────────────
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'name', 'phone', 'address_line', 'city', 'state', 'postal_code', 'is_default']


# ── Wishlist ──────────────────────────────────────────────────────────────────
class WishlistSerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'products']


# ── Review ────────────────────────────────────────────────────────────────────
class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'username', 'user_full_name',
                  'rating', 'title', 'comment', 'created_at']
        read_only_fields = ['user']

    def get_user_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username


# ── Coupon ────────────────────────────────────────────────────────────────────
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['code', 'discount_type', 'discount_value', 'min_order_amount', 'valid_to']
