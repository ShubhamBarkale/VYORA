from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Category, Cart, CartItem, Order, OrderItem, Product, Review


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
        response = self.client.post(
            self.assistant_url,
            {'message': 'Find headphones under ₹4,000'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product['id'] for product in response.data['recommendations']],
            [self.headphones.id],
        )
        self.assertEqual(response.data['recommendations'][0]['discounted_price'], '3600.00')
        self.assertEqual(response.data['recommendations'][0]['stock'], 5)

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
        self.assertEqual(
            response.data['review_summary']['excerpts'][0]['text'],
            'Good sound and comfortable fit.',
        )

    def test_personalized_search_uses_users_cart_activity(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.headphones, quantity=1)
        response = self.client.post(
            self.assistant_url,
            {'action': 'recommend', 'message': ''},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['personalized'])
        self.assertEqual(response.data['recommendations'][0]['id'], self.headphones.id)

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

# Create your tests here.
