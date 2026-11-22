from django.core.management.base import BaseCommand
from apps.accounts.models import User, UserRole


class Command(BaseCommand):
    help = 'Seeds or resets the root administrator account without runtime auto-seeding.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='admin@rgsenterprises.com', help='Admin login email')
        parser.add_argument('--password', type=str, default='AdminPass@2026', help='Admin raw password')
        parser.add_argument('--name', type=str, default='System Administrator', help='Admin full name')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options['password']
        name = options['name']

        user = User.objects.filter(email=email).first()
        if user:
            user.set_password(password)
            user.role = UserRole.ADMIN
            user.full_name = name
            user.is_active = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Updated existing admin account: {email}"))
        else:
            user = User(
                email=email,
                full_name=name,
                role=UserRole.ADMIN,
                is_active=True
            )
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created new root admin account: {email}"))
