"""
Management command to assign external image URLs to all products.
Uses Unsplash Source URLs — these are stable, publicly accessible, and free.
Run: python manage.py seed_images
"""
from django.core.management.base import BaseCommand
from store.models import Product

# Maps product name (substring, case-insensitive) → external image URL
# Using direct Unsplash photo URLs (stable CDN links, no API key needed)
IMAGE_MAP = [
    # Electronics
    ("Wireless Bluetooth Earbuds",
     "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80&fit=crop"),
    ("Smart LED Desk Lamp",
     "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80&fit=crop"),
    ("Mechanical Gaming Keyboard",
     "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&q=80&fit=crop"),
    ("Portable Bluetooth Speaker",
     "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80&fit=crop"),
    ("USB-C Hub",
     "https://images.unsplash.com/photo-1625758800440-26f9b2a19f35?w=600&q=80&fit=crop"),

    # Home & Kitchen
    ("Stainless Steel Water Bottle",
     "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80&fit=crop"),
    ("Ceramic Non-Stick Cookware",
     "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80&fit=crop"),
    ("Electric Kettle",
     "https://images.unsplash.com/photo-1594226801341-41427b4e5c22?w=600&q=80&fit=crop"),
    ("Bamboo Cutting Board",
     "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80&fit=crop"),
    ("Air Purifier",
     "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80&fit=crop"),

    # Fashion
    ("Oxford Shirt",
     "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80&fit=crop"),
    ("Floral Wrap Dress",
     "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80&fit=crop"),
    ("Leather Wallet",
     "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80&fit=crop"),
    ("Running Sneakers",
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&fit=crop"),

    # Beauty & Health
    ("Vitamin C Face Serum",
     "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80&fit=crop"),
    ("Hair Dryer",
     "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80&fit=crop"),
    ("Digital Bathroom Scale",
     "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80&fit=crop"),
    ("Sunscreen",
     "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80&fit=crop"),

    # Sports & Fitness
    ("Yoga Mat",
     "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&q=80&fit=crop"),
    ("Adjustable Dumbbell",
     "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&fit=crop"),
    ("Smart Fitness Band",
     "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80&fit=crop"),

    # Books
    ("Atomic Habits",
     "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80&fit=crop"),
    ("Psychology of Money",
     "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80&fit=crop"),
    ("Deep Work",
     "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80&fit=crop"),

    # Toys & Games
    ("LEGO",
     "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80&fit=crop"),
    ("Wireless Gaming Controller",
     "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=600&q=80&fit=crop"),

    # Legacy products from original DB
    ("bulb",
     "https://images.unsplash.com/photo-1507646227500-4d389b0012be?w=600&q=80&fit=crop"),
    ("Table",
     "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80&fit=crop"),
    ("oil",
     "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80&fit=crop"),
]

# Fallback image for any product not matched above
FALLBACK_URL = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80&fit=crop"


class Command(BaseCommand):
    help = 'Assign external image URLs to all products that do not have a local image'

    def handle(self, *args, **options):
        products = Product.objects.all()
        updated = 0
        skipped = 0

        for product in products:
            # Skip products that already have a local uploaded image
            if product.image:
                self.stdout.write(f"  SKIP (has local image): {product.name}")
                skipped += 1
                continue

            # Find matching URL
            matched_url = None
            for keyword, url in IMAGE_MAP:
                if keyword.lower() in product.name.lower():
                    matched_url = url
                    break

            if not matched_url:
                matched_url = FALLBACK_URL
                self.stdout.write(
                    self.style.WARNING(f"  FALLBACK: {product.name}")
                )
            else:
                self.stdout.write(f"  MATCHED: {product.name}")

            product.external_image_url = matched_url
            product.save(update_fields=['external_image_url'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {updated} products updated with external URLs, {skipped} skipped (have local images).'
        ))
