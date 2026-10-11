"""
Management command to add 16 more products to reach 45+.
Run: python manage.py seed_extra_products
"""
from django.core.management.base import BaseCommand
from store.models import Category, Product


EXTRA_PRODUCTS = [
    # Electronics
    {
        'category': 'Electronics',
        'name': 'Smart WiFi LED Bulb Pack of 2',
        'description': 'Voice-controlled smart LED bulbs compatible with Alexa, Google Home. 16 million colors, dimmable, energy-saving 9W equivalent to 60W.',
        'specifications': 'Wattage: 9W | Lumens: 800 | Color: 16M RGB | Voice: Alexa/Google | Base: E27 | Lifespan: 25000h',
        'price': 1299, 'discount_percent': 15, 'stock': 80, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': '4K Action Camera Waterproof',
        'description': 'Shoot 4K@60fps video with electronic image stabilization. Waterproof up to 10m without housing. Wide-angle lens, slow-motion mode, WiFi.',
        'specifications': 'Video: 4K@60fps | Photo: 20MP | EIS: Yes | Waterproof: 10m | Battery: 1300mAh | Storage: microSD up to 128GB',
        'price': 5999, 'discount_percent': 20, 'stock': 18, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': 'Noise Cancelling Headphones Over-Ear',
        'description': 'Premium over-ear headphones with 40-hour battery, multipoint connection to 2 devices simultaneously, and foldable design for travel.',
        'specifications': 'Driver: 40mm | ANC: Hybrid 3-mic | Battery: 40h | Connectivity: BT 5.2 + 3.5mm | Foldable: Yes | Weight: 250g',
        'price': 6499, 'discount_percent': 30, 'stock': 22, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': 'Wireless Charging Pad 15W',
        'description': 'Fast wireless charger compatible with all Qi-enabled devices. 15W max for Samsung, 12W for iPhone. Non-slip surface, LED indicator.',
        'specifications': 'Power: 15W max | Standard: Qi | Compat: iPhone/Samsung/Android | Cable: USB-C included | Size: 10cm dia.',
        'price': 899, 'discount_percent': 0, 'stock': 100, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&q=80&fit=crop',
    },
    # Home & Kitchen
    {
        'category': 'Home & Kitchen',
        'name': 'Vacuum Storage Bags Set of 8',
        'description': 'Airtight vacuum compression bags to save up to 80% space. Hand pump included. Perfect for clothes, blankets, duvets. Reusable and durable.',
        'specifications': 'Set: 8 bags (2XL+2L+2M+2S) | Material: 3-layer PA/PE | Pump: Hand pump included | Seal: Double-zip + valve',
        'price': 699, 'discount_percent': 10, 'stock': 90, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Digital Kitchen Scale 5kg',
        'description': 'Precision kitchen scale with 1g accuracy up to 5kg. Tare function, unit switch (g/oz/ml/lb), sleek tempered glass platform.',
        'specifications': 'Capacity: 5kg | Accuracy: 1g | Units: g/oz/ml/lb | Platform: Tempered glass | Power: 2×AAA | Display: LCD backlit',
        'price': 549, 'discount_percent': 0, 'stock': 60, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1612538498456-e861df91d4d0?w=600&q=80&fit=crop',
    },
    # Fashion
    {
        'category': 'Fashion',
        'name': 'Premium Denim Jeans Slim Fit',
        'description': 'Classic slim-fit denim jeans in stretch fabric for all-day comfort. Mid-rise, 5-pocket design. Available in dark indigo wash.',
        'specifications': 'Material: 98% Cotton 2% Elastane | Fit: Slim | Rise: Mid | Wash: Dark Indigo | Sizes: 28-38 waist',
        'price': 1999, 'discount_percent': 20, 'stock': 65, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80&fit=crop',
    },
    {
        'category': 'Fashion',
        'name': 'Polarized Sunglasses UV400',
        'description': 'Stylish polarized sunglasses with UV400 protection. Lightweight TR90 frame, spring hinges, scratch-resistant lenses. Unisex design.',
        'specifications': 'Lens: Polarized UV400 | Frame: TR90 | Hinge: Spring | Gender: Unisex | Case: Hard case included',
        'price': 899, 'discount_percent': 0, 'stock': 75, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80&fit=crop',
    },
    {
        'category': 'Fashion',
        'name': "Women's Casual Hoodie Oversized",
        'description': 'Cosy oversized hoodie in soft fleece fabric with kangaroo pocket and adjustable drawstring. Perfect for lounging or casual outings.',
        'specifications': 'Material: 70% Cotton 30% Polyester fleece | Fit: Oversized | Pocket: Kangaroo | Care: Machine wash | Sizes: XS-XXL',
        'price': 1599, 'discount_percent': 25, 'stock': 50, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80&fit=crop',
    },
    # Beauty & Health
    {
        'category': 'Beauty & Health',
        'name': 'Retinol Anti-Aging Night Cream',
        'description': '0.3% Retinol + Hyaluronic Acid + Peptides night cream. Reduces fine lines, firms skin, improves texture overnight. Dermatologist tested.',
        'specifications': 'Retinol: 0.3% | Key: HA, Peptides, Niacinamide | Size: 50ml | Skin type: All | Use: Night | Paraben-free: Yes',
        'price': 1199, 'discount_percent': 0, 'stock': 85, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80&fit=crop',
    },
    {
        'category': 'Beauty & Health',
        'name': 'Electric Toothbrush Sonic Pro',
        'description': 'Sonic electric toothbrush with 40,000 strokes/min, 5 brushing modes, 2-minute smart timer, and 4-week battery. Whitening mode included.',
        'specifications': 'Strokes: 40,000/min | Modes: 5 | Timer: 2-min | Battery: 4 weeks | Heads: 2 included | Waterproof: IPX7',
        'price': 1799, 'discount_percent': 15, 'stock': 40, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1559591937-abc1f2826ceb?w=600&q=80&fit=crop',
    },
    # Sports & Fitness
    {
        'category': 'Sports & Fitness',
        'name': 'Resistance Bands Set of 5',
        'description': 'Premium latex resistance bands in 5 resistance levels (10–50 lbs). Great for home workouts, physical therapy, and warm-ups. Carry bag included.',
        'specifications': 'Levels: 5 (10/20/30/40/50 lbs) | Material: Natural latex | Length: 208cm loop | Includes: Carry bag + guide',
        'price': 599, 'discount_percent': 0, 'stock': 120, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&fit=crop',
    },
    {
        'category': 'Sports & Fitness',
        'name': 'Stainless Steel Shaker Bottle 700ml',
        'description': 'Leak-proof protein shaker with stainless steel mixing ball. Measurement markings, flip lid with secure lock, dishwasher safe.',
        'specifications': 'Capacity: 700ml | Material: BPA-free Tritan | Mixing: SS ball | Lid: Flip-top lock | Dishwasher safe: Yes',
        'price': 449, 'discount_percent': 10, 'stock': 110, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80&fit=crop',
    },
    # Books
    {
        'category': 'Books',
        'name': 'Zero to One — Peter Thiel',
        'description': 'Notes on startups and how to build the future. Peter Thiel shares insights on creating new businesses and monopolies that change the world.',
        'specifications': 'Author: Peter Thiel | Publisher: Crown Business | Pages: 224 | Language: English | Format: Paperback | ISBN: 9780804139021',
        'price': 449, 'discount_percent': 10, 'stock': 160, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80&fit=crop',
    },
    # Toys & Games
    {
        'category': 'Toys & Games',
        'name': 'Chess Set Wooden Premium',
        'description': 'Classic handcrafted wooden chess set with folding storage board. 32 weighted pieces with felt base. Board size 40×40cm. For ages 8+.',
        'specifications': 'Board: 40×40cm folding | Pieces: 32 weighted | Material: Natural wood | Age: 8+ | Storage: Inside folding board',
        'price': 1299, 'discount_percent': 0, 'stock': 30, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80&fit=crop',
    },
    {
        'category': 'Toys & Games',
        'name': 'Rubik\'s Cube Speed 3x3',
        'description': 'Professional speed cube with corner cutting, adjustable tension, and smooth rotation. Carbon fiber sticker finish. Competition ready.',
        'specifications': 'Size: 57mm | Mechanism: Speed corner-cut | Stickers: Carbon fiber | Turn: Smooth 45° cut | Level: Beginner to Pro',
        'price': 349, 'discount_percent': 0, 'stock': 95, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1551373884-8a0750074df7?w=600&q=80&fit=crop',
    },
]


class Command(BaseCommand):
    help = 'Add 16 extra products to expand catalog toward 45+'

    def handle(self, *args, **options):
        added = 0
        for p in EXTRA_PRODUCTS:
            cat = Category.objects.filter(name=p['category']).first()
            if not cat:
                self.stdout.write(self.style.WARNING(f"  Category not found: {p['category']}"))
                continue
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
                    'external_image_url': p['ext'],
                }
            )
            label = 'Created' if created else 'Updated'
            self.stdout.write(f"  {label}: {product.name}")
            added += 1

        total = Product.objects.filter(is_active=True).count()
        self.stdout.write(self.style.SUCCESS(f'\nDone! {added} products processed. Total active: {total}'))
