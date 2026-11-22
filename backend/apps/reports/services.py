import csv
import io
import datetime
from decimal import Decimal
from django.utils import timezone
from apps.hubs.models import Hub
from apps.finance.models import RentAgreement, RentInvoice, HubMonthlyCost, HubAnnualCost
from apps.hr.models import SalaryPayment
from apps.core.models import OrganizationSettings


def _calculate_tenure_months(agreement) -> str:
    if not agreement or not agreement.start_date or not agreement.end_date:
        return ''
    months = (agreement.end_date.year - agreement.start_date.year) * 12 + (agreement.end_date.month - agreement.start_date.month)
    return str(max(1, months))


def generate_financial_csv(year: int, export_type: str = 'total', hub_id: int = None) -> tuple[str, str]:
    """
    Generates enterprise Excel-compatible CSV export matching exact template structure.
    Returns (filename, csv_text).
    """
    settings = OrganizationSettings.objects.first()
    vendor_name = settings.company_name if settings and settings.company_name else "RGS Enterprises"
    year_str = f"{year:04d}"

    template_headers = [
        'Vendor', 'Hub Status', 'State', 'Hub Model', 'Owner', 'ERP Name',
        'Start Date', 'End Date', 'Tenure', 'Area',
        'Rent', 'Setup Cost/Month', 'Electricity', 'WiFi', 'Manpower', 'Housekeeping', 'WM Refreshment/Petty Cash', 'Total Revenue',
        'Rent', 'TDS 10 %', 'TDS Amount', 'Total Rent After TDS', 'GST 18%', 'Total Rent Including GST', 'Electricity Bill', 'WiFi Bill', 'Sorter Payments', 'Petty Cash', 'Total',
        'Profit', 'Margin', 'Status'
    ]

    output = io.StringIO()
    # Write UTF-8 BOM so Microsoft Excel opens it correctly
    output.write('\ufeff')
    writer = csv.writer(output)

    if export_type == 'single' and hub_id:
        try:
            hub = Hub.objects.get(pk=hub_id, is_deleted=False)
        except Hub.DoesNotExist:
            raise ValueError(f"Hub with id {hub_id} not found.")

        hub_name_slug = hub.name.replace(" ", "_")
        filename = f"rgs_{hub_name_slug}_monthly_{year}.csv"
        writer.writerow(['Month'] + template_headers)

        agreement = RentAgreement.objects.filter(hub=hub, is_active=True).first()
        if not agreement:
            agreement = RentAgreement.objects.filter(hub=hub).order_by('-start_date').first()

        start_date = agreement.start_date.isoformat() if agreement and agreement.start_date else ''
        end_date = agreement.end_date.isoformat() if agreement and agreement.end_date else ''
        tenure = _calculate_tenure_months(agreement)
        area = float(hub.total_capacity or 0)
        state_code = hub.state.code if hub.state else ''

        # Monthly costs & invoices for this year
        invoices = {inv.period_month.month: inv for inv in RentInvoice.objects.filter(hub=hub, period_month__year=year)}
        costs = {c.period_month.month: c for c in HubMonthlyCost.objects.filter(hub=hub, period_month__year=year)}

        monthly_rent = float(agreement.monthly_rent if agreement else 0)
        setup_cost = float(agreement.total_setup_cost / 12) if agreement and agreement.total_setup_cost else 0.0

        for m in range(1, 13):
            month_label = datetime.date(year, m, 1).strftime('%b %Y')
            inv = invoices.get(m)
            cost = costs.get(m)

            rent_val = float(inv.base_rent) if inv else monthly_rent
            tds_amt = float(inv.tds_amount) if inv else (rent_val * 0.10)
            rent_after_tds = rent_val - tds_amt
            gst_amt = float(inv.gst_amount) if inv else (rent_val * 0.18)
            rent_inc_gst = rent_after_tds + gst_amt

            elec_bill = float(cost.electricity_bill) if cost else 0.0
            wifi_bill = 0.0
            sorter = float(cost.sorter_payments) if cost else 0.0
            petty = float(cost.petty_cash) if cost else 0.0
            total_cost = rent_inc_gst + elec_bill + wifi_bill + sorter + petty

            total_rev = rent_val + setup_cost
            profit = total_rev - total_cost
            margin = profit - setup_cost

            owner_val = getattr(hub, 'owner_name', None) or getattr(hub, 'owner_address', None) or 'Owner'
            writer.writerow([
                month_label, vendor_name, hub.status, state_code, hub.model, owner_val, hub.name,
                start_date, end_date, tenure, area,
                round(rent_val, 2), round(setup_cost, 2), 0.0, 0.0, 0.0, 0.0, 0.0, round(total_rev, 2),
                round(rent_val, 2), '10%', round(tds_amt, 2), round(rent_after_tds, 2), '18%', round(rent_inc_gst, 2),
                round(elec_bill, 2), round(wifi_bill, 2), round(sorter, 2), round(petty, 2), round(total_cost, 2),
                round(profit, 2), round(margin, 2), 'Active'
            ])

        return filename, output.getvalue()

    # TOTAL PORTFOLIO EXPORT
    filename = f"rgs_all_hubs_financial_report_{year}.csv"
    writer.writerow(template_headers)

    hubs = Hub.objects.filter(is_deleted=False).select_related('state').order_by('name')
    for hub in hubs:
        agreement = RentAgreement.objects.filter(hub=hub, is_active=True).first()
        if not agreement:
            agreement = RentAgreement.objects.filter(hub=hub).order_by('-start_date').first()

        start_date = agreement.start_date.isoformat() if agreement and agreement.start_date else ''
        end_date = agreement.end_date.isoformat() if agreement and agreement.end_date else ''
        tenure = _calculate_tenure_months(agreement)
        area = float(hub.total_capacity or 0)
        state_code = hub.state.code if hub.state else ''

        rent_val = float(agreement.monthly_rent if agreement else 0)
        setup_cost = float(agreement.total_setup_cost / 12) if agreement and agreement.total_setup_cost else 0.0
        tds_amt = rent_val * 0.10
        rent_after_tds = rent_val - tds_amt
        gst_amt = rent_val * 0.18
        rent_inc_gst = rent_after_tds + gst_amt
        total_rev = rent_val + setup_cost
        total_cost = rent_inc_gst
        profit = total_rev - total_cost
        margin = profit - setup_cost

        owner_val = getattr(hub, 'owner_name', None) or getattr(hub, 'owner_address', None) or 'Owner'
        writer.writerow([
            vendor_name, hub.status, state_code, hub.model, owner_val, hub.name,
            start_date, end_date, tenure, area,
            round(rent_val, 2), round(setup_cost, 2), 0.0, 0.0, 0.0, 0.0, 0.0, round(total_rev, 2),
            round(rent_val, 2), '10%', round(tds_amt, 2), round(rent_after_tds, 2), '18%', round(rent_inc_gst, 2),
            0.0, 0.0, 0.0, 0.0, round(total_cost, 2),
            round(profit, 2), round(margin, 2), 'Active'
        ])

    return filename, output.getvalue()
