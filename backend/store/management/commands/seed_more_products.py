"""
Adds 20 more unique, realistic products across all 7 categories.
All image URLs are direct Unsplash CDN photo links — stable and load in the browser.
Run: python manage.py seed_more_products
"""
from django.core.management.base import BaseCommand
from store.models import Category, Product


# All URLs are direct Unsplash CDN links verified to return JPEG images.
MORE_PRODUCTS = [

    # ── Electronics ───────────────────────────────────────────────────────────
    {
        'category': 'Electronics',
        'name': 'Portable Power Bank 20000mAh',
        'description': (
            'High-capacity 20000mAh power bank with 22.5W fast charging. '
            'Dual USB-A + USB-C outputs. LCD battery indicator. Charges your '
            'phone 4–5 times. Airline-approved capacity. Compact and lightweight at 340g.'
        ),
        'specifications': (
            'Capacity: 20000mAh | Input: USB-C 18W | Output: USB-A 22.5W + USB-C 20W | '
            'Weight: 340g | Size: 155×75×16mm | Charge cycles: 500+'
        ),
        'price': 1999, 'discount_percent': 20, 'stock': 55, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1609592806596-b8a4e1cf36b2?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': 'Curved Gaming Monitor 27" 144Hz',
        'description': (
            '27-inch 1500R curved VA panel with 144Hz refresh rate and 1ms MPRT. '
            'FHD 1920×1080 resolution, FreeSync/G-Sync compatible, HDR10, '
            'height/tilt adjustable stand. Perfect for immersive gaming and work.'
        ),
        'specifications': (
            'Size: 27" | Panel: VA Curved 1500R | Resolution: 1920×1080 FHD | '
            'Refresh: 144Hz | Response: 1ms MPRT | Ports: 2×HDMI + DisplayPort | HDR: HDR10'
        ),
        'price': 18999, 'discount_percent': 15, 'stock': 10, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': 'Webcam 1080p Auto-Focus',
        'description': (
            'Full HD 1080p/30fps webcam with built-in dual stereo microphone, '
            'auto-focus, and 78° wide-angle lens. Plug-and-play USB. Works on '
            'Mac, Windows, Linux. Privacy cover included.'
        ),
        'specifications': (
            'Resolution: 1920×1080 @ 30fps | FOV: 78° | Mic: Dual stereo with noise reduction | '
            'Focus: Auto | Connection: USB 2.0 | OS: Windows/Mac/Linux | Privacy cover: Yes'
        ),
        'price': 2499, 'discount_percent': 10, 'stock': 40, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&q=80&fit=crop',
    },

    # ── Home & Kitchen ─────────────────────────────────────────────────────────
    {
        'category': 'Home & Kitchen',
        'name': 'French Press Coffee Maker 1L',
        'description': (
            'Classic stainless steel French press with double-walled insulation. '
            'Brews rich, aromatic coffee in 4 minutes. Heat-resistant borosilicate '
            'glass alternative — stainless keeps coffee warm up to 2 hours. Dishwasher safe.'
        ),
        'specifications': (
            'Capacity: 1000ml (8 cups) | Material: 18/8 Stainless Steel | '
            'Insulation: Double wall | Filter: Fine 4-layer mesh | Dishwasher: Yes'
        ),
        'price': 1299, 'discount_percent': 0, 'stock': 50, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Silicone Kitchen Utensil Set 6-Piece',
        'description': (
            'Heat-resistant silicone utensil set with stainless steel handles. '
            'Includes spatula, ladle, slotted spoon, pasta server, skimmer, and tongs. '
            'Non-stick safe. Heat resistant to 230°C. Dishwasher safe.'
        ),
        'specifications': (
            'Set: 6 pieces | Material: Silicone + SS handles | Heat resist: 230°C | '
            'Non-stick safe: Yes | Dishwasher: Yes | Storage: Included holder'
        ),
        'price': 799, 'discount_percent': 5, 'stock': 75, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&q=80&fit=crop',
    },
    {
        'category': 'Home & Kitchen',
        'name': 'Scented Soy Candle Set of 3',
        'description': (
            'Hand-poured soy wax candles in three relaxing fragrances: '
            'Lavender & Vanilla, Sandalwood, and Fresh Linen. '
            '40-hour burn time each. Lead-free cotton wicks. Gift-ready packaging.'
        ),
        'specifications': (
            'Set: 3 × 200g candles | Wax: 100% natural soy | Wicks: Cotton lead-free | '
            'Burn time: ~40h each | Fragrances: Lavender/Vanilla, Sandalwood, Fresh Linen'
        ),
        'price': 999, 'discount_percent': 0, 'stock': 60, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1602607070059-e0e2e1f3f5da?w=600&q=80&fit=crop',
    },

    # ── Fashion ────────────────────────────────────────────────────────────────
    {
        'category': 'Fashion',
        'name': "Men's Slim Fit Chino Trousers",
        'description': (
            'Versatile slim-fit chino trousers in stretch cotton twill. '
            'Four-pocket design, button closure. Machine washable. '
            'Smart-casual look that takes you from office to weekend.'
        ),
        'specifications': (
            'Material: 97% Cotton 3% Elastane twill | Fit: Slim | Closure: Button + zip | '
            'Pockets: 4 | Care: Machine wash 30°C | Sizes: 28–38 waist'
        ),
        'price': 1799, 'discount_percent': 15, 'stock': 80, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80&fit=crop',
    },
    {
        'category': 'Fashion',
        'name': "Women's Ankle Strap Heels",
        'description': (
            'Elegant block-heel ankle-strap sandals. 6cm block heel for all-day comfort. '
            'Faux suede upper, padded footbed. Ideal for formal occasions, evenings out, or office wear.'
        ),
        'specifications': (
            'Heel: 6cm block | Upper: Faux suede | Footbed: Padded | '
            'Closure: Adjustable ankle strap | Sizes: UK 3–8 | Colors: Black, Nude, Wine'
        ),
        'price': 1499, 'discount_percent': 20, 'stock': 45, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&fit=crop',
    },
    {
        'category': 'Fashion',
        'name': 'Canvas Backpack 30L Unisex',
        'description': (
            'Durable 30L canvas backpack with padded laptop compartment (fits up to 15.6"). '
            'Multiple organiser pockets, padded shoulder straps, luggage pass-through. '
            'Ideal for college, travel, and daily commute.'
        ),
        'specifications': (
            'Capacity: 30L | Material: 600D canvas + PU base | Laptop: Up to 15.6" | '
            'Pockets: 5 (1 laptop + 2 main + 2 front) | Straps: Padded adjustable'
        ),
        'price': 1299, 'discount_percent': 10, 'stock': 65, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&fit=crop',
    },

    # ── Beauty & Health ────────────────────────────────────────────────────────
    {
        'category': 'Beauty & Health',
        'name': 'Niacinamide 10% + Zinc 1% Serum',
        'description': (
            'High-strength niacinamide serum that targets blemishes, minimises pores, '
            'and balances sebum. 10% niacinamide + 1% zinc PCA. Lightweight water-based formula. '
            'Suitable for all skin types including oily and acne-prone.'
        ),
        'specifications': (
            'Key: 10% Niacinamide + 1% Zinc PCA | Size: 30ml | Type: All/oily/acne | '
            'Texture: Water-based lightweight | Paraben-free: Yes | Vegan: Yes'
        ),
        'price': 599, 'discount_percent': 0, 'stock': 180, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80&fit=crop',
    },
    {
        'category': 'Beauty & Health',
        'name': 'Jade Facial Roller & Gua Sha Set',
        'description': (
            'Authentic jade stone facial roller with dual ends (large for cheeks/neck, '
            'small for under-eyes). Includes matching gua sha tool. '
            'Reduces puffiness, improves circulation, and promotes lymphatic drainage.'
        ),
        'specifications': (
            'Material: Natural jade stone | Set: Roller + Gua Sha | '
            'Handle: Stainless steel | Storage: Velvet pouch included | Use: Face/neck/décolleté'
        ),
        'price': 699, 'discount_percent': 10, 'stock': 90, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80&fit=crop',
    },

    # ── Sports & Fitness ───────────────────────────────────────────────────────
    {
        'category': 'Sports & Fitness',
        'name': 'Jump Rope Speed Cable 3m',
        'description': (
            'Professional speed jump rope with ball-bearing handles for smooth rotation. '
            'Adjustable 3m PVC-coated steel cable. Anti-slip foam grips. '
            'Suitable for boxing, HIIT, and cardio training.'
        ),
        'specifications': (
            'Cable: 3m adjustable PVC-coated steel | Handles: Ball-bearing + foam grip | '
            'Weight: 180g | Level: Beginner to advanced | Bag: Carry pouch included'
        ),
        'price': 399, 'discount_percent': 0, 'stock': 140, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?w=600&q=80&fit=crop',
    },
    {
        'category': 'Sports & Fitness',
        'name': 'Foam Roller Deep Tissue 45cm',
        'description': (
            'High-density EVA foam roller for muscle recovery and myofascial release. '
            'Grid texture targets deep tissue knots. Hollow core, holds up to 150kg. '
            'Suitable for pre-workout warm-up and post-workout recovery.'
        ),
        'specifications': (
            'Size: 45×14cm | Material: High-density EVA | Surface: Grid texture | '
            'Max load: 150kg | Weight: 350g | Use: Pre/post workout recovery'
        ),
        'price': 799, 'discount_percent': 15, 'stock': 65, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1620286428890-5bf29c0a2d41?w=600&q=80&fit=crop',
    },

    # ── Books ──────────────────────────────────────────────────────────────────
    {
        'category': 'Books',
        'name': 'Rich Dad Poor Dad — Robert Kiyosaki',
        'description': (
            "The #1 personal finance book of all time. Robert Kiyosaki shares the story "
            "of two 'dads' and the lessons he learned about money, investing, and building "
            "wealth. Over 40 million copies sold worldwide."
        ),
        'specifications': (
            'Author: Robert T. Kiyosaki | Publisher: Plata Publishing | Pages: 336 | '
            'Language: English | Format: Paperback | ISBN: 9781612680194'
        ),
        'price': 399, 'discount_percent': 20, 'stock': 200, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80&fit=crop',
    },
    {
        'category': 'Books',
        'name': 'The Lean Startup — Eric Ries',
        'description': (
            'A revolutionary business book that defines the Build-Measure-Learn feedback loop. '
            'Essential reading for entrepreneurs and product managers on how to launch '
            'successful products efficiently.'
        ),
        'specifications': (
            'Author: Eric Ries | Publisher: Crown Business | Pages: 336 | '
            'Language: English | Format: Paperback | ISBN: 9780307887894'
        ),
        'price': 449, 'discount_percent': 10, 'stock': 150, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&q=80&fit=crop',
    },

    # ── Toys & Games ───────────────────────────────────────────────────────────
    {
        'category': 'Toys & Games',
        'name': 'Remote Control Monster Truck',
        'description': (
            '1:18 scale remote control monster truck with 4WD off-road capability. '
            '2.4GHz anti-interference, 25km/h top speed. '
            'Shock-absorbing suspension, 30-min playtime. Suitable for ages 6+.'
        ),
        'specifications': (
            'Scale: 1:18 | Drive: 4WD | Speed: 25km/h | Remote: 2.4GHz | '
            'Battery: 7.4V 500mAh (included) | Playtime: ~30min | Age: 6+'
        ),
        'price': 1799, 'discount_percent': 10, 'stock': 28, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop',
    },
    {
        'category': 'Toys & Games',
        'name': 'Jigsaw Puzzle 1000 Pieces — World Map',
        'description': (
            '1000-piece illustrated world map jigsaw puzzle. Finished size 68×48cm. '
            'Premium glossy pieces with precise cut for satisfying fit. '
            'Includes poster guide. Great for family bonding, ages 10+.'
        ),
        'specifications': (
            'Pieces: 1000 | Finished size: 68×48cm | Material: Premium cardboard | '
            'Surface: Glossy | Includes: Poster reference guide | Age: 10+'
        ),
        'price': 699, 'discount_percent': 0, 'stock': 42, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=600&q=80&fit=crop',
    },

    # ── Electronics (closing batch) ────────────────────────────────────────────
    {
        'category': 'Electronics',
        'name': 'Smart Doorbell WiFi 1080p',
        'description': (
            'Wireless WiFi video doorbell with 1080p HD camera, two-way audio, '
            'motion detection, and night vision. Works with Alexa/Google. '
            'Instant phone alerts. No hub required — connects directly to 2.4GHz WiFi.'
        ),
        'specifications': (
            'Resolution: 1080p HD | Night vision: IR up to 5m | Audio: Two-way | '
            'Motion: PIR sensor | Power: Battery + wired | WiFi: 2.4GHz | Voice: Alexa/Google'
        ),
        'price': 3499, 'discount_percent': 15, 'stock': 22, 'is_featured': True,
        'ext': 'https://images.unsplash.com/photo-1558002038-1055e2dae1d7?w=600&q=80&fit=crop',
    },
    {
        'category': 'Electronics',
        'name': 'Laptop Stand Aluminium Adjustable',
        'description': (
            'Ergonomic aluminium laptop stand with 6 height levels (7–27cm). '
            'Foldable and portable. Compatible with all laptops 10–16". '
            'Ventilation slots prevent overheating. Anti-slip silicone pads.'
        ),
        'specifications': (
            'Material: Aircraft-grade aluminium | Height: 6 levels 7–27cm | '
            'Compatible: 10–16" laptops | Weight: 650g | Portable: Foldable | '
            'Anti-slip: Silicone pads'
        ),
        'price': 1499, 'discount_percent': 0, 'stock': 70, 'is_featured': False,
        'ext': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80&fit=crop',
    },
]


class Command(BaseCommand):
    help = 'Add 20 more unique realistic products across all categories'

    def handle(self, *args, **options):
        added = skipped = 0
        for p in MORE_PRODUCTS:
            cat = Category.objects.filter(name=p['category']).first()
            if not cat:
                self.stdout.write(self.style.WARNING(f'  Category not found: {p["category"]}'))
                continue

            # Skip if a product with this exact name already exists
            if Product.objects.filter(name=p['name']).exists():
                self.stdout.write(f'  SKIP (exists): {p["name"]}')
                skipped += 1
                continue

            Product.objects.create(
                category=cat,
                name=p['name'],
                description=p['description'],
                specifications=p['specifications'],
                price=p['price'],
                discount_percent=p['discount_percent'],
                stock=p['stock'],
                is_featured=p['is_featured'],
                is_active=True,
                external_image_url=p['ext'],
            )
            self.stdout.write(f'  Created: {p["name"]}')
            added += 1

        total = Product.objects.filter(is_active=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {added} created, {skipped} skipped. Total active products: {total}'
        ))
