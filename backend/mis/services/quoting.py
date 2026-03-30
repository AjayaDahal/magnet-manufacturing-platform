import json
from openai import AsyncOpenAI
from config import get_settings

PRICING_PROMPT = """You are a print shop quoting assistant for Magnet Manufacturing.
Given a customer inquiry, generate a detailed quote with line items.

Pricing guidelines:
- Vinyl magnet: $0.15/sq inch base, +20% for complex designs
- Rigid magnet: $0.25/sq inch base
- Minimum order: $50
- Setup fee: $25 per unique design
- Rush (< 3 days): +50%
- Quantity discounts: 100+ = 10% off, 500+ = 20% off, 1000+ = 30% off

Return JSON with:
{
  "items": [{"name": str, "quantity": int, "unit_price": float, "total": float, "notes": str}],
  "subtotal": float,
  "setup_fee": float,
  "discount_pct": float,
  "discount_amount": float,
  "total_price": float,
  "estimated_days": int,
  "notes": str
}"""

EMAIL_PROMPT = """You are a professional sales representative for Magnet Manufacturing.
Write a friendly, professional quote email based on the provided quote data.
Include all line items, pricing, and estimated delivery.
Keep it concise but warm. Sign off as "Magnet Manufacturing Team"."""


async def generate_quote(inquiry_text: str, items: list[dict]) -> dict:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

    user_msg = f"Customer inquiry: {inquiry_text}\n\nItems requested: {json.dumps(items)}" if items else f"Customer inquiry: {inquiry_text}"

    resp = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": PRICING_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    return json.loads(resp.choices[0].message.content)


async def generate_quote_email(quote_data: dict, customer_name: str) -> str:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

    resp = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": EMAIL_PROMPT},
            {"role": "user", "content": f"Customer: {customer_name}\nQuote data: {json.dumps(quote_data)}"},
        ],
        temperature=0.5,
    )

    return resp.choices[0].message.content
