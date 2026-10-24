from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True, default='🛍️')
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    specifications = models.TextField(blank=True, help_text='Store as plain text or JSON string')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.PositiveIntegerField(default=0, help_text='Discount percentage (0-100)')
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    # External image URL — used when no local image is uploaded
    external_image_url = models.URLField(max_length=500, blank=True, default='')
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def discounted_price(self):
        from decimal import Decimal
        if self.discount_percent > 0:
            return round(self.price * (1 - Decimal(self.discount_percent) / 100), 2)
        return self.price

    @property
    def in_stock(self):
        return self.stock > 0

    @property
    def average_rating(self):
        result = self.reviews.aggregate(avg=Avg('rating'))
        return result['avg'] or 0

    @property
    def review_count(self):
        return self.reviews.count()


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return self.user.username


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address_line = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Addresses'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.name} — {self.city}, {self.state}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('COD', 'Cash on Delivery'),
        ('RAZORPAY', 'Razorpay'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='orders')
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    # Shipping address snapshot (stored so that deleting address doesn't break order history)
    shipping_name = models.CharField(max_length=100, blank=True)
    shipping_phone = models.CharField(max_length=15, blank=True)
    shipping_address = models.TextField(blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_postal_code = models.CharField(max_length=10, blank=True)
    # Payment
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='COD')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    razorpay_signature = models.CharField(max_length=200, blank=True)
    # Financials
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coupon_code = models.CharField(max_length=30, blank=True)
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate: SC + zero-padded id. We first save to get an id, then update.
            super().save(*args, **kwargs)
            self.order_number = f"SC{self.id:05d}"
            Order.objects.filter(pk=self.pk).update(order_number=self.order_number)
        else:
            super().save(*args, **kwargs)

    def record_status_update(self, status, note='', save=True):
        if status not in dict(self.STATUS_CHOICES):
            raise ValueError(f'Invalid order status: {status}')

        self.status = status
        if save:
            self.save(update_fields=['status', 'updated_at'])

        OrderStatusUpdate.objects.create(
            order=self,
            status=status,
            note=note or self._status_note(status),
        )

    def _status_note(self, status):
        notes = {
            'pending': 'Order placed and awaiting payment confirmation.',
            'confirmed': 'Order confirmed and being prepared.',
            'processing': 'Order is being processed.',
            'shipped': 'Order has been shipped.',
            'out_for_delivery': 'Order is out for delivery. Demo tracking status only.',
            'delivered': 'Order delivered successfully.',
            'cancelled': 'Order was cancelled.',
        }
        return notes.get(status, 'Order status updated.')


class OrderStatusUpdate(models.Model):
    order = models.ForeignKey(Order, related_name='status_history', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.order.order_number} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=200, default='')   # snapshot at time of order
    product_image = models.CharField(max_length=500, blank=True, default='')  # snapshot path
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # price at time of order

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"

    @property
    def subtotal(self):
        return self.price * self.quantity


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart {self.id} for {self.user}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.product.discounted_price * self.quantity

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"


class Wishlist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wishlist')
    products = models.ManyToManyField(Product, blank=True, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Wishlist of {self.user.username}"


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(default=5)   # 1-5
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'user')   # one review per user per product
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.product.name} ({self.rating}★)"


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    code = models.CharField(max_length=30, unique=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                              help_text='Max cap for percentage discounts')
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    usage_limit = models.PositiveIntegerField(default=0, help_text='0 = unlimited')
    used_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.code

    @property
    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.valid_from or now > self.valid_to:
            return False
        if self.usage_limit > 0 and self.used_count >= self.usage_limit:
            return False
        return True

    def calculate_discount(self, order_total):
        if not self.is_valid:
            return 0
        if order_total < self.min_order_amount:
            return 0
        if self.discount_type == 'percentage':
            discount = order_total * self.discount_value / 100
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
            return round(discount, 2)
        else:
            return min(self.discount_value, order_total)
