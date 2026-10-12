from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('register/', views.register_view),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', views.forgot_password),
    path('reset-password/', views.reset_password),

    # ── User Profile ──────────────────────────────────────────────────────────
    path('profile/', views.get_profile),
    path('profile/update/', views.update_profile),
    path('profile/change-password/', views.change_password),

    # ── Addresses ─────────────────────────────────────────────────────────────
    path('addresses/', views.address_list),
    path('addresses/<int:pk>/', views.address_detail),

    # ── Products ──────────────────────────────────────────────────────────────
    path('products/', views.get_products),
    path('products/<int:pk>/', views.get_product),
    path('products/<int:pk>/related/', views.get_related_products),
    path('products/<int:pk>/reviews/', views.get_product_reviews),
    path('products/<int:pk>/review/', views.create_review),
    path('categories/', views.get_categories),
    path('featured/', views.get_featured_products),

    # ── Cart ──────────────────────────────────────────────────────────────────
    path('cart/', views.get_cart),
    path('cart/add/', views.add_to_cart),
    path('cart/remove/', views.remove_from_cart),
    path('cart/update/', views.update_cart_quantity),

    # ── Wishlist ──────────────────────────────────────────────────────────────
    path('wishlist/', views.get_wishlist),
    path('wishlist/toggle/', views.toggle_wishlist),
    path('wishlist/move-to-cart/', views.move_to_cart),

    # ── Coupon ────────────────────────────────────────────────────────────────
    path('coupon/validate/', views.validate_coupon),
    path('ai/assistant/', views.ai_shopping_assistant),

    # ── Orders ────────────────────────────────────────────────────────────────
    path('orders/create/', views.create_order),
    path('orders/', views.get_my_orders),
    path('orders/<str:order_number>/', views.get_order_detail),

    # ── Razorpay ──────────────────────────────────────────────────────────────
    path('payment/create/', views.create_razorpay_order),
    path('payment/verify/', views.verify_razorpay_payment),
]
