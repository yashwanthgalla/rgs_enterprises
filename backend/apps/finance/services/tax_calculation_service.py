from decimal import Decimal, ROUND_HALF_UP
from typing import Dict


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_rent_invoice_taxes(
    base_rent: Decimal,
    tds_applied: bool = True,
    tds_percent: Decimal = Decimal('10.00'),
    gst_applied: bool = True,
    gst_percent: Decimal = Decimal('18.00')
) -> Dict[str, Decimal]:
    """
    Computes TDS 194I and GST for rent invoices matching production formula:
    - Base rent: base_rent
    - TDS: (base_rent * tds_percent / 100) if tds_applied else 0.00
    - GST: (base_rent * gst_percent / 100) if gst_applied else 0.00
    - Net payable: base_rent - TDS + GST
    """
    base_rent = round_currency(Decimal(str(base_rent)))

    if tds_applied and tds_percent > Decimal('0'):
        tds_amount = round_currency(base_rent * (Decimal(str(tds_percent)) / Decimal('100.00')))
    else:
        tds_amount = Decimal('0.00')

    if gst_applied and gst_percent > Decimal('0'):
        gst_amount = round_currency(base_rent * (Decimal(str(gst_percent)) / Decimal('100.00')))
    else:
        gst_amount = Decimal('0.00')

    net_payable = round_currency(base_rent - tds_amount + gst_amount)

    return {
        "base_rent": base_rent,
        "tds_amount": tds_amount,
        "gst_amount": gst_amount,
        "net_payable": net_payable
    }
