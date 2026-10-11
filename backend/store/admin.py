from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Category, Product, UserProfile, Address,
    Order, OrderItem, Cart, CartItem,
    Wishlist, Review, Coupon
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'slug', 'product_count')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'


class ProductImagePreview(admin.ModelAdmin):
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:4px;" />', obj.image.url)
        return '—'
    image_preview.short_description = 'Preview'


@admin.register(Product)
class ProductAdmin(ProductImagePreview):
    list_display = ('image_preview', 'name', 'category', 'price', 'discount_percent',
                    'discounted_price', 'stock', 'is_active', 'is_featured', 'created_at')
    list_filter = ('category', 'is_active', 'is_featured')
    search_fields = ('name', 'description')
    list_editable = ('price', 'discount_percent', 'stock', 'is_active', 'is_featured')
    prepopulated_fields = {}
    readonly_fields = ('image_preview', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Info', {'fields': ('name', 'category', 'description', 'specifications')}),
        ('Pricing & Stock', {'fields': ('price', 'discount_percent', 'stock')}),
        ('Media', {'fields': ('image', 'image_preview')}),
        ('Visibility', {'fields': ('is_active', 'is_featured')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def discounted_price(self, obj):
        return f"₹{obj.discounted_price}"
    discounted_price.short_description = 'Final Price'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'product_name', 'product_image', 'quantity', 'price')
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'status', 'payment_method', 'payment_status',
                    'total_amount', 'created_at')
    list_filter = ('status', 'payment_method', 'payment_status')
    search_fields = ('order_number', 'user__username', 'shipping_name', 'shipping_phone')
    readonly_fields = ('order_number', 'created_at', 'updated_at', 'razorpay_order_id',
                       'razorpay_payment_id', 'razorpay_signature')
    list_editable = ('status',)
    inlines = [OrderItemInline]
    fieldsets = (
        ('Order Info', {'fields': ('order_number', 'user', 'status', 'created_at', 'updated_at')}),
        ('Shipping', {'fields': ('shipping_name', 'shipping_phone', 'shipping_address',
                                 'shipping_city', 'shipping_state', 'shipping_postal_code')}),
        ('Payment', {'fields': ('payment_method', 'payment_status', 'razorpay_order_id',
                                'razorpay_payment_id', 'razorpay_signature')}),
        ('Financials', {'fields': ('subtotal', 'discount_amount', 'shipping_charge',
                                   'total_amount', 'coupon_code')}),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'title', 'created_at')
    list_filter = ('rating',)
    search_fields = ('product__name', 'user__username', 'comment')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'min_order_amount',
                    'valid_from', 'valid_to', 'is_active', 'used_count', 'usage_limit')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code',)
    list_editable = ('is_active',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone')
    search_fields = ('user__username', 'user__email', 'phone')


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'city', 'state', 'postal_code', 'is_default')
    list_filter = ('state',)
    search_fields = ('user__username', 'name', 'city', 'phone')


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('product', 'quantity')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'item_count', 'total', 'created_at')
    inlines = [CartItemInline]

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'product_count')
    search_fields = ('user__username',)

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'
