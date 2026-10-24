import re
from collections import Counter
from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Q

from .models import Order, Product, Review


STOP_WORDS = {
    'a', 'an', 'and', 'are', 'best', 'buy', 'can', 'compare', 'do', 'for',
    'find', 'good', 'help', 'i', 'in', 'is', 'me', 'my', 'of', 'on', 'or',
    'please', 'product', 'recommend', 'show', 'the', 'to', 'what', 'with',
    'would', 'you', 'your', 'under', 'below', 'within', 'budget', 'price',
    'track', 'tracking', 'where', 'order', 'status', 'review', 'reviews',
    'rating', 'ratings', 'summary', 'vs', 'versus',
}

BUDGET_PATTERN = re.compile(
    r'(?:under|below|within|budget(?:\s+of)?|up\s+to|upto|max(?:imum)?)'
    r'\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(k|thousand)?'
    r'|(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)\s*(k|thousand)?',
    re.IGNORECASE,
)
SUPPLIED_BUDGET_PATTERN = re.compile(
    r'^(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(k|thousand)?$',
    re.IGNORECASE,
)
ORDER_NUMBER_PATTERN = re.compile(r'\b(?:SC)?\d{4,}\b', re.IGNORECASE)
SC_ORDER_NUMBER_PATTERN = re.compile(r'\bSC\d{4,}\b', re.IGNORECASE)
SEARCH_SYNONYMS = {
    'earbud': {'earbuds', 'earphone', 'earphones', 'headphone', 'headphones', 'headset'},
    'earbuds': {'earbud', 'earphone', 'earphones', 'headphone', 'headphones', 'headset'},
    'headphone': {'headphones', 'earbud', 'earbuds', 'earphone', 'earphones', 'headset'},
    'headphones': {'headphone', 'earbud', 'earbuds', 'earphone', 'earphones', 'headset'},
    'laptop': {'notebook', 'computer'},
    'mobile': {'phone', 'smartphone'},
    'phone': {'mobile', 'smartphone'},
    'sneaker': {'sneakers', 'shoe', 'shoes', 'footwear'},
    'sneakers': {'sneaker', 'shoe', 'shoes', 'footwear'},
}


def _tokens(value):
    return {
        token for token in re.findall(r'[a-z0-9]+', (value or '').lower())
        if len(token) > 1 and not token.isdigit() and token not in STOP_WORDS
    }


def _extract_budget(message, supplied_budget):
    raw_budget = supplied_budget
    scale = ''
    if raw_budget in (None, ''):
        match = BUDGET_PATTERN.search(message)
        if match:
            raw_budget = match.group(1) or match.group(3)
            scale = match.group(2) or match.group(4) or ''
    if raw_budget in (None, ''):
        return None
    supplied_match = SUPPLIED_BUDGET_PATTERN.fullmatch(str(raw_budget).strip())
    if supplied_match:
        raw_budget = supplied_match.group(1)
        scale = scale or supplied_match.group(2) or ''
    try:
        value = Decimal(str(raw_budget).replace(',', '').strip())
    except (InvalidOperation, ValueError):
        raise ValueError('Enter a valid budget amount.')
    if not value.is_finite() or value <= 0:
        raise ValueError('Budget must be greater than zero.')
    if scale.lower() in {'k', 'thousand'}:
        value *= 1000
    return value


def _product_text(product):
    return ' '.join((product.name, product.category.name, product.description, product.specifications)).lower()


def _matching_products(message, user, budget, limit):
    tokens = _tokens(message)
    search_tokens = tokens | set().union(*(SEARCH_SYNONYMS.get(token, set()) for token in tokens))
    query = Product.objects.filter(is_active=True).select_related('category').annotate(
        _average_rating=Avg('reviews__rating'),
        _review_count=Count('reviews', distinct=True),
    )
    if not tokens and user and user.is_authenticated:
        query = query.exclude(cartitem__cart__user=user)
    if search_tokens:
        text_filter = Q()
        for token in search_tokens:
            text_filter |= (
                Q(name__icontains=token)
                | Q(category__name__icontains=token)
                | Q(description__icontains=token)
                | Q(specifications__icontains=token)
            )
        query = query.filter(text_filter)

    preferred_categories = Counter()
    if user and user.is_authenticated:
        cart_products = Product.objects.filter(cartitem__cart__user=user, is_active=True)
        wishlist_products = Product.objects.filter(wishlisted_by__user=user, is_active=True)
        ordered_products = Product.objects.filter(orderitem__order__user=user, is_active=True)
        for products in (cart_products, wishlist_products, ordered_products):
            preferred_categories.update(
                products.values_list('category_id', flat=True)
            )

    ranked = []
    for product in query[:1000]:
        text = _product_text(product)
        name = product.name.lower()
        score = sum(
            (4 if token in name else 2 if token in product.category.name.lower() else 1)
            for token in search_tokens if token in text
        )
        if preferred_categories:
            score += preferred_categories.get(product.category_id, 0) * 2
        if product.is_featured:
            score += 0.25
        if product.stock > 0:
            score += 0.1
        if budget is not None and product.discounted_price > budget:
            continue
        ranked.append((score, product))

    ranked.sort(key=lambda item: (item[0], item[1].created_at), reverse=True)
    return [product for _, product in ranked[:limit]], bool(preferred_categories)


def _find_named_products(message, product_ids, limit=3):
    query_tokens = _tokens(message)
    search_tokens = query_tokens | set().union(
        *(SEARCH_SYNONYMS.get(token, set()) for token in query_tokens)
    )
    products = Product.objects.filter(is_active=True).select_related('category').annotate(
        _average_rating=Avg('reviews__rating'),
        _review_count=Count('reviews', distinct=True),
    )
    if product_ids:
        try:
            ids = [int(product_id) for product_id in product_ids[:limit]]
        except (TypeError, ValueError):
            ids = []
        selected = list(products.filter(id__in=ids))
        selected.sort(key=lambda product: ids.index(product.id))
        if selected:
            return selected

    ranked = []
    for product in products[:1000]:
        name_tokens = _tokens(product.name)
        overlap = len(name_tokens & search_tokens)
        if overlap:
            ranked.append((overlap / max(len(name_tokens), 1), overlap, product))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [item[2] for item in ranked[:limit] if item[0] >= 0.5]


def _summarize_reviews(product):
    reviews = Review.objects.filter(product=product)
    aggregate = reviews.aggregate(average=Avg('rating'), count=Count('id'))
    distribution = {
        row['rating']: row['count']
        for row in reviews.values('rating').annotate(count=Count('id'))
    }
    positive_count = sum(distribution.get(rating, 0) for rating in (4, 5))
    mixed_count = distribution.get(3, 0)
    critical_count = sum(distribution.get(rating, 0) for rating in (1, 2))
    excerpts = []
    for review in reviews.only('rating', 'title', 'comment', 'created_at')[:3]:
        text = review.comment.strip() or review.title.strip()
        if text:
            excerpts.append({
                'rating': review.rating,
                'text': text[:240],
            })
    average = aggregate['average']
    if aggregate['count']:
        summary = (
            f"{positive_count} of {aggregate['count']} reviewers rated this product 4 or 5 stars; "
            f"{mixed_count} gave it 3 stars and {critical_count} gave it 1 or 2 stars. "
            f"The catalog average is {round(average, 1)} out of 5."
        )
    else:
        summary = 'No customer reviews have been submitted for this product.'

    return {
        'product_id': product.id,
        'product_name': product.name,
        'review_count': aggregate['count'],
        'average_rating': round(average, 1) if average is not None else None,
        'rating_distribution': {
            str(rating): distribution.get(rating, 0) for rating in range(1, 6)
        },
        'excerpts': excerpts,
        'summary': summary,
        'summary_note': 'Summary is calculated directly from stored product ratings and review excerpts.',
    }


def _track_order(user, message, order_number):
    requested_number = (order_number or '').strip()
    if not requested_number:
        match = ORDER_NUMBER_PATTERN.search(message)
        requested_number = match.group(0) if match else ''
    orders = Order.objects.filter(user=user).prefetch_related('items', 'status_history')
    if requested_number:
        orders = orders.filter(order_number__iexact=requested_number)
    order = orders.first()
    if not order:
        return None
    return {
        'order_number': order.order_number,
        'status': order.status,
        'payment_status': order.payment_status,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'total_amount': str(order.total_amount),
        'items': [
            {
                'product_name': item.product_name,
                'quantity': item.quantity,
                'price': str(item.price),
            }
            for item in order.items.all()
        ],
        'status_history': [
            {
                'status': update.status,
                'note': update.note,
                'created_at': update.created_at,
            }
            for update in order.status_history.all()
        ],
    }


def build_assistant_result(
    *,
    message,
    user,
    action='',
    budget=None,
    product_ids=None,
    order_number='',
    limit=4,
):
    normalized = message.lower()
    inferred_action = action or ''
    if not inferred_action:
        has_order_reference = SC_ORDER_NUMBER_PATTERN.search(normalized) or (
            'order' in normalized and ORDER_NUMBER_PATTERN.search(normalized)
        )
        if any(word in normalized for word in ('track', 'tracking', 'where is my order', 'order status')) or has_order_reference:
            inferred_action = 'order_tracking'
        elif any(word in normalized for word in ('review', 'reviews', 'rating', 'ratings')):
            inferred_action = 'reviews'
        elif 'compare' in normalized or re.search(r'\bvs\b|\bversus\b', normalized):
            inferred_action = 'compare'
        elif any(word in normalized for word in ('recommend', 'suggest', 'similar')):
            inferred_action = 'recommend'
        else:
            inferred_action = 'search'

    if inferred_action == 'order_tracking':
        if not user or not user.is_authenticated:
            return {
                'status': 401,
                'data': {'error': 'Sign in to securely track your orders.'},
            }
        order = _track_order(user, message, order_number)
        if not order:
            return {
                'status': 200,
                'data': {
                    'intent': inferred_action,
                    'assistant_reply': 'I could not find that order in your account. Check the order number or ask for your latest order.',
                    'order': None,
                },
            }
        return {
            'status': 200,
            'data': {
                'intent': inferred_action,
                'assistant_reply': f"Order {order['order_number']} is {order['status'].replace('_', ' ')}. This status is from your order record.",
                'order': order,
            },
        }

    if inferred_action in {'compare', 'reviews'}:
        matched = _find_named_products(message, product_ids or [])
        if inferred_action == 'reviews':
            if not matched:
                return {
                    'status': 200,
                    'data': {
                        'intent': inferred_action,
                        'assistant_reply': 'Tell me which product you want review details for, or open a product and choose Reviews.',
                        'review_summary': None,
                        'recommendations': [],
                    },
                }
            product = matched[0]
            return {
                'status': 200,
                'data': {
                    'intent': inferred_action,
                    'assistant_reply': f"Here are the stored review ratings and excerpts for {product.name}.",
                    'review_summary': _summarize_reviews(product),
                    'recommendations': [product],
                },
            }

        if len(matched) < 2:
            return {
                'status': 200,
                'data': {
                    'intent': inferred_action,
                    'assistant_reply': 'Name or select two catalog products to compare. I only compare products that exist in the catalog.',
                    'comparison': [],
                    'recommendations': matched,
                },
            }
        return {
            'status': 200,
            'data': {
                'intent': inferred_action,
                'assistant_reply': 'Here is a comparison using current catalog prices, stock, ratings, and specifications.',
                'comparison': matched[:2],
                'recommendations': matched[:2],
            },
        }

    effective_budget = _extract_budget(message, budget)
    products, personalized = _matching_products(
        message, user, effective_budget, max(1, min(int(limit), 6))
    )
    if not products:
        reply = 'I could not find matching active products within that budget. Try a broader search or a higher budget.'
    elif effective_budget is not None:
        reply = f"Found {len(products)} active catalog option(s) priced at or below ₹{effective_budget:,.2f}."
    elif personalized:
        reply = f"Found {len(products)} catalog option(s), ranked using your shopping activity and this request."
    else:
        reply = f"Found {len(products)} matching active product(s) from the catalog."

    return {
        'status': 200,
        'data': {
            'intent': inferred_action,
            'assistant_reply': reply,
            'budget': str(effective_budget) if effective_budget is not None else None,
            'personalized': personalized,
            'recommendations': products,
        },
    }
