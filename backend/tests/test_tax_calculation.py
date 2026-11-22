import pytest
from decimal import Decimal
from apps.finance.services.tax_calculation_service import calculate_rent_invoice_taxes


def test_standard_tax_calculation():
    # Base rent 18,000; TDS 10% (1,800); GST 18% (3,240)
    # Net payable: 18,000 - 1,800 + 3,240 = 19,440.00
    res = calculate_rent_invoice_taxes(
        base_rent=Decimal('18000.00'),
        tds_applied=True,
        tds_percent=Decimal('10.00'),
        gst_applied=True,
        gst_percent=Decimal('18.00')
    )
    assert res['base_rent'] == Decimal('18000.00')
    assert res['tds_amount'] == Decimal('1800.00')
    assert res['gst_amount'] == Decimal('3240.00')
    assert res['net_payable'] == Decimal('19440.00')


def test_tax_calculation_without_tds():
    # TDS waived: Net = 18,000 + 3,240 = 21,240.00
    res = calculate_rent_invoice_taxes(
        base_rent=Decimal('18000.00'),
        tds_applied=False,
        gst_applied=True,
        gst_percent=Decimal('18.00')
    )
    assert res['tds_amount'] == Decimal('0.00')
    assert res['gst_amount'] == Decimal('3240.00')
    assert res['net_payable'] == Decimal('21240.00')


def test_tax_calculation_without_gst():
    # GST not applicable (unregistered landlord): Net = 18,000 - 1,800 = 16,200.00
    res = calculate_rent_invoice_taxes(
        base_rent=Decimal('18000.00'),
        tds_applied=True,
        tds_percent=Decimal('10.00'),
        gst_applied=False
    )
    assert res['tds_amount'] == Decimal('1800.00')
    assert res['gst_amount'] == Decimal('0.00')
    assert res['net_payable'] == Decimal('16200.00')


def test_tax_calculation_precision_and_rounding():
    # Odd amounts with fractional cents rounding
    res = calculate_rent_invoice_taxes(
        base_rent=Decimal('12345.67'),
        tds_applied=True,
        tds_percent=Decimal('10.00'),
        gst_applied=True,
        gst_percent=Decimal('18.00')
    )
    # TDS: 1234.567 -> 1234.57
    # GST: 2222.2206 -> 2222.22
    # Net: 12345.67 - 1234.57 + 2222.22 = 13333.32
    assert res['tds_amount'] == Decimal('1234.57')
    assert res['gst_amount'] == Decimal('2222.22')
    assert res['net_payable'] == Decimal('13333.32')
