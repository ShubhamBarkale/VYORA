"""
Management command to seed the database with realistic sample products.
Run: python manage.py seed_products
"""
from django.core.management.base import BaseCommand
from store.models import Category, Product, Coupon
from django.utils import timezone
from datetime import timedelta
import urllib.request
import os


CATEGORIES = [
    {'name': 'Electronics', 'slug': 'electronics', 'icon': '📱', 'description': 'Gadgets, phones, laptops & accessories'},
    {'name': 'Home & Kitchen', 'slug': 'home-kitchen', 'icon': '🏠', 'description': 'Everything for your home'},
    {'name': 'Fashion', 'slug': 'fashion', 'icon': '👗', 'description': 'Clothing, shoes & accessories'},
    {'name': 'Beauty & Health', 'slug': 'beauty-health', 'icon': '💄', 'description': 'Skincare, haircare & wellness'},
    {'name': 'Sports & Fitness', 'slug': 'sports-fitness', 'icon': '🏋️', 'description': 'Gym equipment & sportswear'},
    {'name': 'Books', 'slug': 'books', 'icon': '📚', 'description': 'Fiction, non-fiction & textbooks'},
    {'name': 'Toys & Games', 'slug': 'toys-games', 'icon': '🎮', 'description': 'Fun for all ages'},
]

PRODUCTS = [
    # Electronics
    {
        'category': 'Electronics',
        'name': 'Wireless Bluetooth Earbuds Pro',
        'description': 'True wireless earbuds with active noise cancellation, 30-hour battery life, and premium sound quality. IPX5 water resistant with fast charging case.',
        'specifications': 'Driver: 10mm dynamic | Freq: 20Hz-20kHz | Battery: 8h+22h | Connectivity: Bluetooth 5.3 | Charging: USB-C',
        'price': 2999,
        'discount_percent': 25,
        'stock': 50,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    },
    {
        'category': 'Electronics',
        'name': 'Smart LED Desk Lamp',
        'description': 'USB-C rechargeable desk lamp with adjustable brightness (10 levels) and color temperature. Built-in wireless charging pad and touch controls.',
        'specifications': 'Power: 10W | Color Temp: 2700K-6500K | CRI: 95+ | Charging: 10W Qi wireless | Material: Aluminum alloy',
        'price': 1499,
        'discount_percent': 10,
        'stock': 35,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
        'category': 'Electronics',
        'name': 'Mechanical Gaming Keyboard',
        'description': 'TKL mechanical keyboard with Cherry MX Red switches. Per-key RGB backlighting, anti-ghosting, N-key rollover. Detachable USB-C cable.',
        'specifications': 'Switch: Cherry MX Red | Keys: 87 TKL | Backlight: Per-key RGB | Cable: Detachable USB-C | Keycaps: Double-shot PBT',
        'price': 4499,
        'discount_percent': 15,
        'stock': 20,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
    },
    {
        'category': 'Electronics',
        'name': 'Portable Bluetooth Speaker',
        'description': '360° surround sound speaker with 20W output, 12-hour battery, IPX7 waterproof rating. Pair two speakers for stereo mode.',
        'specifications': 'Output: 20W (10W×2) | Battery: 12 hours | Waterproof: IPX7 | Connectivity: BT 5.0 | Size: 180×80mm',
        'price': 2499,
        'discount_percent': 20,
        'stock': 45,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    },
    {
        'category': 'Electronics',
        'name': 'USB-C Hub 7-in-1',
        'description': 'Compact 7-in-1 USB-C hub with 4K HDMI, 100W PD passthrough, 3× USB-A 3.0, SD/microSD card readers. Aluminum body with heat dissipation.',
        'specifications': 'Ports: HDMI 4K@60Hz, 3×USB-A 3.0, SD, microSD, USB-C PD 100W | Material: Aluminum | Cable: 20cm',
        'price': 1799,
        'discount_percent': 0,
        'stock': 60,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1625758800440-26f9b2a19f35?w=400',
    },
    # Home & Kitchen
    {
        'category': 'Home & Kitchen',
        'name': 'Stainless Steel Water Bottle 1L',
        'description': 'Double-wall vacuum insulated bottle keeps drinks cold 24 hours or hot 12 hours. BPA-free, leak-proof lid, scratch-resistant powder coat finish.',
        'specifications': 'Capacity: 1000ml | Material: 18/8 Stainless Steel | Insulation: Cold 24h / Hot 12h | Lid: Leak-proof twist | Weight: 320g',
        'price': 899,
        'discount_percent': 10,
        'stock': 100,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Ceramic Non-Stick Cookware Set',
        'description': '5-piece ceramic non-stick cookware set. PFOA-free coating, compatible with all stovetops including induction. Dishwasher safe glass lids.',
        'specifications': 'Set: 20cm fry pan, 24cm fry pan, 20cm saucepan, 24cm saucepan, 28cm wok | Coating: Ceramic PFOA-free | Induction: Yes',
        'price': 3999,
        'discount_percent': 30,
        'stock': 15,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Electric Kettle 1.7L',
        'description': 'Fast-boil electric kettle with 1500W heating element, auto shut-off, and boil-dry protection. 360° cordless base. BPA-free interior.',
        'specifications': 'Capacity: 1.7L | Power: 1500W | Boil Time: ~3 min | Material: SS 304 interior | Features: Auto shut-off, dry-boil protection',
        'price': 1299,
        'discount_percent': 5,
        'stock': 40,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1594226801341-41427b4e5c22?w=400',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Bamboo Cutting Board Set',
        'description': 'Set of 3 organic bamboo cutting boards with juice grooves. Antimicrobial surface, easy-grip handles, dishwasher safe. Eco-friendly and durable.',
        'specifications': 'Set: 3 boards (S/M/L) | Material: Organic Moso bamboo | Feature: Juice groove, anti-slip feet | Care: Dishwasher safe',
        'price': 699,
        'discount_percent': 0,
        'stock': 80,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Air Purifier HEPA H13',
        'description': 'True HEPA H13 air purifier covers 400 sq ft. Removes 99.97% of particles. 4-stage filtration with pre-filter, HEPA, activated carbon & UV-C light.',
        'specifications': 'Coverage: 400 sq ft | CADR: 300 m³/h | Filter: True HEPA H13 | Noise: 25-52dB | Timer: 1/2/4/8h | Display: LED touch',
        'price': 8999,
        'discount_percent': 20,
        'stock': 12,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
    },
    # Fashion
    {
        'category': 'Fashion',
        'name': "Men's Classic Oxford Shirt",
        'description': 'Premium 100% cotton Oxford weave shirt. Regular fit with button-down collar. Machine washable. Available in S-3XL.',
        'specifications': 'Material: 100% cotton Oxford weave | Fit: Regular | Collar: Button-down | Care: Machine wash cold | Sizes: S, M, L, XL, XXL, 3XL',
        'price': 1299,
        'discount_percent': 0,
        'stock': 120,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400',
    },
    {
        'category': 'Fashion',
        'name': "Women's Floral Wrap Dress",
        'description': 'Elegant floral wrap dress in soft viscose fabric. Adjustable tie belt, V-neck, knee-length. Perfect for casual and semi-formal occasions.',
        'specifications': 'Material: 100% Viscose | Length: Knee | Fit: Wrap | Neckline: V-neck | Care: Hand wash | Sizes: XS-XXL',
        'price': 1799,
        'discount_percent': 25,
        'stock': 75,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
    },
    {
        'category': 'Fashion',
        'name': 'Leather Wallet Slim',
        'description': 'Genuine full-grain leather bifold wallet. RFID blocking, 8 card slots, 2 bill compartments, ID window. Ultra-slim 8mm profile.',
        'specifications': 'Material: Full-grain cowhide | RFID: Yes | Cards: 8 slots | Bills: 2 compartments | Thickness: 8mm | Color: Brown / Black',
        'price': 999,
        'discount_percent': 0,
        'stock': 90,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
    },
    {
        'category': 'Fashion',
        'name': 'Running Sneakers Pro',
        'description': 'Lightweight breathable mesh running shoes with responsive cushioning. Anti-slip rubber outsole, padded collar and tongue.',
        'specifications': 'Upper: Breathable mesh | Sole: Anti-slip rubber | Cushioning: EVA midsole | Weight: 280g/shoe | Sizes: UK 6-12',
        'price': 2999,
        'discount_percent': 15,
        'stock': 55,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    },
    # Beauty & Health
    {
        'category': 'Beauty & Health',
        'name': 'Vitamin C Face Serum 30ml',
        'description': '15% Vitamin C + Ferulic Acid + Vitamin E brightening serum. Reduces dark spots, boosts collagen, protects from oxidative stress. For all skin types.',
        'specifications': 'Size: 30ml | Key: 15% Vit-C, Ferulic Acid, Vit-E | Type: All skin | Packaging: Dark glass dropper | Paraben-free: Yes',
        'price': 799,
        'discount_percent': 0,
        'stock': 200,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    },
    {
        'category': 'Beauty & Health',
        'name': 'Hair Dryer Professional 2200W',
        'description': 'Ionic technology hair dryer with 3 heat and 2 speed settings. Concentrator and diffuser attachments included. Cool shot button. Foldable handle.',
        'specifications': 'Power: 2200W | Technology: Ionic | Settings: 3 heat × 2 speed | Attachments: Concentrator, Diffuser | Cord: 2.5m',
        'price': 2199,
        'discount_percent': 20,
        'stock': 30,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400',
    },
    {
        'category': 'Beauty & Health',
        'name': 'Digital Bathroom Scale',
        'description': 'Precision digital scale with 0.1kg accuracy. Tempered glass platform, auto zero/off, 4 high-precision sensors. Measures up to 180kg.',
        'specifications': 'Capacity: 180kg | Accuracy: 0.1kg | Platform: 6mm tempered glass | Power: 4×AAA (included) | Display: Large LED',
        'price': 599,
        'discount_percent': 0,
        'stock': 70,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400',
    },
    {
        'category': 'Beauty & Health',
        'name': 'Sunscreen SPF 50+ PA+++',
        'description': 'Broad spectrum UVA/UVB sunscreen with lightweight matte finish. Non-comedogenic, suitable for oily and acne-prone skin. Water resistant 80 min.',
        'specifications': 'SPF: 50+ PA+++ | Size: 60ml | Finish: Matte | Type: Oily/combination skin | Water resistant: 80 min | Fragrance-free: Yes',
        'price': 399,
        'discount_percent': 10,
        'stock': 150,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    },
    # Sports & Fitness
    {
        'category': 'Sports & Fitness',
        'name': 'Yoga Mat Anti-Slip 6mm',
        'description': 'Eco-friendly TPE yoga mat with double-sided non-slip texture. Alignment lines, extra thick 6mm cushioning, carrying strap included.',
        'specifications': 'Material: TPE (eco-friendly) | Size: 183×61cm | Thickness: 6mm | Feature: Alignment lines, both-side texture | Weight: 1.1kg',
        'price': 1299,
        'discount_percent': 0,
        'stock': 85,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400',
    },
    {
        'category': 'Sports & Fitness',
        'name': 'Adjustable Dumbbell Set 20kg',
        'description': 'Space-saving adjustable dumbbell set. Dial to select 2–20kg in 2kg increments. Steel plates with ABS housing. Includes storage tray.',
        'specifications': 'Range: 2kg–20kg | Increment: 2kg | Adjustment: Dial system | Material: Steel + ABS | Storage: Included tray',
        'price': 7999,
        'discount_percent': 10,
        'stock': 8,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    },
    {
        'category': 'Sports & Fitness',
        'name': 'Smart Fitness Band',
        'description': 'Health & fitness tracker with heart rate, SpO2, sleep tracking, 14 sport modes, 14-day battery, 1.47" AMOLED display. IP68 waterproof.',
        'specifications': 'Display: 1.47" AMOLED | Battery: 14 days | HR: Continuous | SpO2: Yes | Waterproof: IP68 | Sports: 14 modes | Compat: Android/iOS',
        'price': 2499,
        'discount_percent': 30,
        'stock': 40,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
    },
    # Books
    {
        'category': 'Books',
        'name': 'Atomic Habits — James Clear',
        'description': 'An easy and proven way to build good habits and break bad ones. #1 New York Times bestseller. Over 15 million copies sold worldwide.',
        'specifications': 'Author: James Clear | Publisher: Random House | Pages: 320 | Language: English | ISBN: 9780735211292 | Format: Paperback',
        'price': 499,
        'discount_percent': 20,
        'stock': 200,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    },
    {
        'category': 'Books',
        'name': 'The Psychology of Money',
        'description': 'Timeless lessons on wealth, greed and happiness by Morgan Housel. Explores how people think about money with 19 short stories.',
        'specifications': 'Author: Morgan Housel | Publisher: Harriman House | Pages: 256 | Language: English | ISBN: 9780857197689 | Format: Paperback',
        'price': 399,
        'discount_percent': 0,
        'stock': 180,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
    },
    {
        'category': 'Books',
        'name': 'Deep Work — Cal Newport',
        'description': 'Rules for focused success in a distracted world. Cal Newport argues that the ability to perform deep work is becoming rare, increasingly valuable.',
        'specifications': 'Author: Cal Newport | Publisher: Grand Central Publishing | Pages: 296 | Language: English | Format: Paperback',
        'price': 449,
        'discount_percent': 15,
        'stock': 120,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    },
    # Toys & Games
    {
        'category': 'Toys & Games',
        'name': 'LEGO Classic Creative Bricks',
        'description': '790-piece LEGO Classic set with bricks in 33 colours. Open-ended creative play for ages 4+. Includes idea booklet with 10 project ideas.',
        'specifications': 'Pieces: 790 | Ages: 4+ | Colours: 33 | Theme: Classic Creative | Set: 11013 | Material: ABS plastic',
        'price': 1999,
        'discount_percent': 0,
        'stock': 25,
        'is_featured': False,
        'image_url': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400',
    },
    {
        'category': 'Toys & Games',
        'name': 'Wireless Gaming Controller',
        'description': 'Ergonomic wireless game controller compatible with PC, Android, iOS. Dual vibration motors, turbo function, 10-hour battery, 2.4GHz + Bluetooth.',
        'specifications': 'Connectivity: 2.4GHz + BT 5.0 | Battery: 600mAh (10h) | Vibration: Dual motors | Compat: PC/Android/iOS/Switch | Charging: USB-C',
        'price': 1599,
        'discount_percent': 20,
        'stock': 35,
        'is_featured': True,
        'image_url': 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400',
    },
]

COUPONS = [
    {
        'code': 'WELCOME10',
        'discount_type': 'percentage',
        'discount_value': 10,
        'min_order_amount': 500,
        'max_discount_amount': 200,
        'valid_from': timezone.now(),
        'valid_to': timezone.now() + timedelta(days=365),
        'is_active': True,
        'usage_limit': 0,
    },
    {
        'code': 'SAVE20',
        'discount_type': 'percentage',
        'discount_value': 20,
        'min_order_amount': 2000,
        'max_discount_amount': 500,
        'valid_from': timezone.now(),
        'valid_to': timezone.now() + timedelta(days=90),
        'is_active': True,
        'usage_limit': 100,
    },
    {
        'code': 'FLAT100',
        'discount_type': 'fixed',
        'discount_value': 100,
        'min_order_amount': 800,
        'max_discount_amount': None,
        'valid_from': timezone.now(),
        'valid_to': timezone.now() + timedelta(days=30),
        'is_active': True,
        'usage_limit': 50,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with realistic sample products, categories and coupons'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing products before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            Product.objects.all().delete()
            Category.objects.all().delete()
            Coupon.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing products, categories and coupons.'))

        # Create categories
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.update_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'icon': c['icon'], 'description': c['description']},
            )
            cat_map[c['name']] = obj
            status = 'Created' if created else 'Updated'
            self.stdout.write(f"  {status} category: {obj.name}")

        # Create products (image_url stored as external URL if no local file)
        for p in PRODUCTS:
            cat = cat_map[p['category']]
            product, created = Product.objects.update_or_create(
                name=p['name'],
                defaults={
                    'category': cat,
                    'description': p['description'],
                    'specifications': p['specifications'],
                    'price': p['price'],
                    'discount_percent': p['discount_percent'],
                    'stock': p['stock'],
                    'is_featured': p['is_featured'],
                    'is_active': True,
                },
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f"  {status} product: {product.name}")

        # Create coupons
        for c in COUPONS:
            code = c.pop('code')
            Coupon.objects.update_or_create(code=code, defaults=c)
            self.stdout.write(f"  Created/updated coupon: {code}")

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {Category.objects.count()} categories, '
            f'{Product.objects.count()} products, '
            f'{Coupon.objects.count()} coupons.'
        ))
