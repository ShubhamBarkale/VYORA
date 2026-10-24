from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from django.test import override_settings
import hashlib
import hmac
from unittest.mock import Mock, patch
from rest_framework.test import APITestCase

from .models import Category, Cart, CartItem, Coupon, Order, OrderItem, Product, Review


class ShoppingAssistantTests(APITestCase):
    assistant_url = '/api/ai/assistant/'

    def setUp(self):
        self.user = User.objects.create_user(username='shopper', password='test-password')
        self.other_user = User.objects.create_user(username='other', password='test-password')
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.headphones = Product.objects.create(
            category=self.category,
            name='Wireless Noise Cancelling Headphones',
            description='Comfortable headphones for daily listening',
            price='4500.00',
            discount_percent=20,
            stock=5,
        )
        self.keyboard = Product.objects.create(
            category=self.category,
            name='Mechanical Keyboard',
            description='Compact keyboard for work',
            price='2500.00',
            stock=3,
        )

    def test_budget_search_uses_discounted_catalog_price(self):
        for message in ('Find headphones under 4000', 'Find headphones under 4k'):
            with self.subTest(message=message):
                response = self.client.post(
                    self.assistant_url,
                    {'message': message},
                    format='json',
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    [product['id'] for product in response.data['recommendations']],
                    [self.headphones.id],
                )
                self.assertEqual(response.data['recommendations'][0]['discounted_price'], Decimal('3600.00'))
                self.assertEqual(response.data['recommendations'][0]['stock'], 5)

    def test_natural_language_comparison_resolves_product_synonyms(self):
        response = self.client.post(
            self.assistant_url,
            {'message': 'Compare wireless earbuds versus mechanical keyboard'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {product['id'] for product in response.data['comparison']},
            {self.headphones.id, self.keyboard.id},
        )

    def test_product_comparison_returns_only_selected_active_products(self):
        response = self.client.post(
            self.assistant_url,
            {
                'action': 'compare',
                'product_ids': [self.headphones.id, self.keyboard.id],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product['id'] for product in response.data['comparison']],
            [self.headphones.id, self.keyboard.id],
        )
        self.assertEqual(response.data['comparison'][0]['stock'], 5)

    def test_review_summary_uses_stored_reviews(self):
        Review.objects.create(
            product=self.headphones,
            user=self.user,
            rating=4,
            title='Comfortable',
            comment='Good sound and comfortable fit.',
        )
        response = self.client.post(
            self.assistant_url,
            {'action': 'reviews', 'product_id': self.headphones.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['review_summary']['review_count'], 1)
        self.assertEqual(response.data['review_summary']['average_rating'], 4.0)
        self.assertIn('1 of 1 reviewers rated this product 4 or 5 stars', response.data['review_summary']['summary'])
        self.assertEqual(
            response.data['review_summary']['excerpts'][0]['text'],
            'Good sound and comfortable fit.',
        )

    def test_unmatched_search_does_not_fall_back_to_unrelated_products(self):
        response = self.client.post(
            self.assistant_url,
            {'message': 'find a telescope'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['recommendations'], [])
        self.assertIn('could not find matching', response.data['assistant_reply'])

    def test_personalized_search_uses_users_cart_activity(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.headphones, quantity=1)
        home_category = Category.objects.create(name='Home', slug='home')
        Product.objects.create(
            category=home_category,
            name='Decorative Table Lamp',
            description='Ambient light for home',
            price='1200.00',
            stock=2,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.assistant_url,
            {'action': 'recommend', 'message': ''},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['personalized'])
        self.assertEqual(response.data['recommendations'][0]['id'], self.keyboard.id)

    def test_order_tracking_requires_authentication_and_scopes_to_owner(self):
        order = Order.objects.create(
            user=self.other_user,
            total_amount='4500.00',
            status='shipped',
        )
        OrderItem.objects.create(
            order=order,
            product=self.headphones,
            product_name=self.headphones.name,
            quantity=1,
            price='4500.00',
        )
        anonymous_response = self.client.post(
            self.assistant_url,
            {'message': f'Track order {order.order_number}'},
            format='json',
        )
        self.assertEqual(anonymous_response.status_code, 401)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.assistant_url,
            {'message': f'Track order {order.order_number}'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['order'])

    def test_authenticated_order_tracking_returns_own_order(self):
        order = Order.objects.create(
            user=self.user,
            total_amount='2500.00',
            status='processing',
        )
        OrderItem.objects.create(
            order=order,
            product=self.keyboard,
            product_name=self.keyboard.name,
            quantity=1,
            price='2500.00',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.assistant_url,
            {'message': f'Track order {order.order_number}'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['order']['order_number'], order.order_number)
        self.assertEqual(response.data['order']['items'][0]['product_name'], self.keyboard.name)

    def test_cart_add_endpoint_keeps_existing_authentication_and_stock_rules(self):
        anonymous_response = self.client.post(
            '/api/cart/add/',
            {'product_id': self.headphones.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(anonymous_response.status_code, 401)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/cart/add/',
            {'product_id': self.headphones.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['cart']['items'][0]['product_stock'], 5)


class BackendIntegrityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='integrity-shopper', password='test-password')
        self.category = Category.objects.create(name='Clothing', slug='clothing')
        self.product = Product.objects.create(
            category=self.category,
            name='Cotton Shirt',
            price='800.00',
            stock=4,
        )
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
        )
        self.client.force_authenticate(user=self.user)
        self.shipping_data = {
            'shipping_name': 'Test Shopper',
            'shipping_phone': '9876543210',
            'shipping_address': '10 Market Road',
            'shipping_city': 'Pune',
            'shipping_state': 'Maharashtra',
            'shipping_postal_code': '411001',
        }

    def test_product_list_rejects_invalid_pagination_and_price_filters(self):
        invalid_page = self.client.get('/api/products/?page=invalid')
        negative_price = self.client.get('/api/products/?min_price=-1')
        impossible_range = self.client.get('/api/products/?min_price=100&max_price=50')

        self.assertEqual(invalid_page.status_code, 400)
        self.assertEqual(negative_price.status_code, 400)
        self.assertEqual(impossible_range.status_code, 400)

    def test_cart_quantity_validation_rejects_malformed_and_nonpositive_values(self):
        for quantity in ('not-a-number', -1, 1001):
            with self.subTest(quantity=quantity):
                response = self.client.post(
                    '/api/cart/add/',
                    {'product_id': self.product.id, 'quantity': quantity},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)

        update_response = self.client.post(
            '/api/cart/update/',
            {'item_id': self.cart_item.id, 'quantity': 'not-a-number'},
            format='json',
        )
        self.assertEqual(update_response.status_code, 400)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)

    def test_checkout_uses_catalog_price_and_decrements_inventory_atomically(self):
        response = self.client.post(
            '/api/orders/create/',
            {**self.shipping_data, 'payment_method': 'COD', 'total_amount': '0.01'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(order_number=response.data['order_number'])
        self.assertEqual(order.subtotal, Decimal('1600.00'))
        self.assertEqual(order.total_amount, Decimal('1600.00'))
        self.assertEqual(order.payment_status, 'pending')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)
        self.assertFalse(CartItem.objects.filter(pk=self.cart_item.pk).exists())

    def test_checkout_rejects_insufficient_stock_without_creating_order(self):
        Product.objects.filter(pk=self.product.pk).update(stock=1)

        response = self.client.post(
            '/api/orders/create/',
            {**self.shipping_data, 'payment_method': 'COD'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 2)

    @override_settings(DEBUG=False, RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_demo_payment_cannot_be_enabled_by_client_in_production(self):
        order = Order.objects.create(
            user=self.user,
            payment_method='RAZORPAY',
            total_amount='1600.00',
        )
        order.razorpay_order_id = f'demo_{order.order_number}'
        order.save(update_fields=['razorpay_order_id'])
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            price='800.00',
        )
        response = self.client.post(
            '/api/payment/verify/',
            {
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': 'demo_fake',
                'razorpay_signature': 'demo_signature_fake',
                'demo': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 4)

    @override_settings(DEBUG=True, RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_debug_demo_payment_finalizes_the_matching_order_once(self):
        order = Order.objects.create(
            user=self.user,
            payment_method='RAZORPAY',
            total_amount='1600.00',
        )
        order.razorpay_order_id = f'demo_{order.order_number}'
        order.save(update_fields=['razorpay_order_id'])
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            price='800.00',
        )
        response = self.client.post(
            '/api/payment/verify/',
            {
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': 'demo_payment',
                'razorpay_signature': 'demo_signature_test',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)

        repeated_response = self.client.post(
            '/api/payment/verify/',
            {
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': 'demo_payment',
                'razorpay_signature': 'demo_signature_test',
            },
            format='json',
        )
        self.assertEqual(repeated_response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)

    @override_settings(DEBUG=False, RAZORPAY_KEY_ID='key', RAZORPAY_KEY_SECRET='secret')
    @patch('store.views.razorpay.Client')
    def test_payment_verification_checks_provider_payment_amount_and_status(self, client_class):
        order = Order.objects.create(
            user=self.user,
            payment_method='RAZORPAY',
            total_amount='1600.00',
            razorpay_order_id='order_real',
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            price='800.00',
        )
        message = f'{order.razorpay_order_id}|payment_real'
        signature = hmac.new(b'secret', message.encode(), hashlib.sha256).hexdigest()
        provider = Mock()
        provider.payment.fetch.return_value = {
            'order_id': order.razorpay_order_id,
            'amount': 1,
            'currency': 'INR',
            'status': 'captured',
        }
        client_class.return_value = provider

        response = self.client.post(
            '/api/payment/verify/',
            {
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': 'payment_real',
                'razorpay_signature': signature,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 4)
        provider.payment.capture.assert_not_called()

    @override_settings(DEBUG=False, RAZORPAY_KEY_ID='key', RAZORPAY_KEY_SECRET='secret')
    @patch('store.views.razorpay.Client')
    def test_authorized_payment_is_captured_before_order_confirmation(self, client_class):
        order = Order.objects.create(
            user=self.user,
            payment_method='RAZORPAY',
            total_amount='1600.00',
            razorpay_order_id='order_authorized',
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            price='800.00',
        )
        message = f'{order.razorpay_order_id}|payment_authorized'
        signature = hmac.new(b'secret', message.encode(), hashlib.sha256).hexdigest()
        provider = Mock()
        provider.payment.fetch.return_value = {
            'order_id': order.razorpay_order_id,
            'amount': 160000,
            'currency': 'INR',
            'status': 'authorized',
        }
        provider.payment.capture.return_value = {'status': 'captured'}
        client_class.return_value = provider

        response = self.client.post(
            '/api/payment/verify/',
            {
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': 'payment_authorized',
                'razorpay_signature': signature,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        provider.payment.capture.assert_called_once_with(
            'payment_authorized',
            160000,
            {'currency': 'INR'},
        )
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)
        self.assertFalse(CartItem.objects.filter(pk=self.cart_item.pk).exists())

    def test_review_endpoint_rejects_malformed_and_out_of_range_ratings(self):
        for rating in ('bad-rating', 0, 6):
            with self.subTest(rating=rating):
                response = self.client.post(
                    f'/api/products/{self.product.id}/review/',
                    {'rating': rating},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
        self.assertEqual(Review.objects.count(), 0)

    def test_order_list_is_paginated_and_scoped_to_authenticated_user(self):
        for _ in range(3):
            Order.objects.create(user=self.user, total_amount='10.00')
        Order.objects.create(
            user=User.objects.create_user(username='other-shopper'),
            total_amount='10.00',
        )

        response = self.client.get('/api/orders/?page_size=2&page=2')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(response.data['total_pages'], 2)
        self.assertEqual(len(response.data['results']), 1)

    def test_coupon_preview_uses_server_cart_total(self):
        Coupon.objects.create(
            code='SAVE',
            discount_type='fixed',
            discount_value='100.00',
            min_order_amount='5000.00',
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
        )
        response = self.client.post(
            '/api/coupon/validate/',
            {'code': 'SAVE', 'order_total': '999999.00'},
            format='json',
        )

        self.assertIn(response.status_code, (400, 404))
        self.assertNotEqual(response.data.get('valid'), True)
