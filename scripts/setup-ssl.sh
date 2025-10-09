#!/bin/bash
#
# SSL Certificate Setup Script for Meta Chat Platform
#
# This script automates SSL certificate installation using Let's Encrypt Certbot.
# It supports initial setup and renewal configuration.
#
# Usage:
#   sudo ./scripts/setup-ssl.sh
#   sudo ./scripts/setup-ssl.sh --staging  # Test with Let's Encrypt staging
#   sudo ./scripts/setup-ssl.sh --renew    # Force renewal
#
# Prerequisites:
#   - Domain DNS pointing to this server
#   - Port 80 and 443 accessible
#   - Nginx installed
#   - Email address for certificate notifications

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-chat.genai.hr}"
EMAIL="${SSL_EMAIL:-admin@genai.hr}"
WEBROOT="/var/www/letsencrypt"
STAGING_FLAG=""
FORCE_RENEWAL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
for arg in "$@"; do
    case $arg in
        --staging)
            STAGING_FLAG="--staging"
            echo -e "${YELLOW}Using Let's Encrypt staging environment${NC}"
            ;;
        --renew)
            FORCE_RENEWAL="--force-renewal"
            echo -e "${YELLOW}Forcing certificate renewal${NC}"
            ;;
        --help)
            echo "Usage: $0 [--staging] [--renew]"
            echo ""
            echo "Options:"
            echo "  --staging    Use Let's Encrypt staging environment (for testing)"
            echo "  --renew      Force certificate renewal"
            echo ""
            echo "Environment variables:"
            echo "  DOMAIN       Domain name (default: chat.genai.hr)"
            echo "  SSL_EMAIL    Email for certificate notifications (default: admin@genai.hr)"
            exit 0
            ;;
    esac
done

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

echo "========================================================================="
echo "Meta Chat Platform - SSL Certificate Setup"
echo "========================================================================="
echo ""
echo "Domain:    $DOMAIN"
echo "Email:     $EMAIL"
echo "Webroot:   $WEBROOT"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot not found. Installing...${NC}"

    # Detect OS
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}Error: Unsupported operating system${NC}"
        echo "Please install certbot manually: https://certbot.eff.org/"
        exit 1
    fi

    echo -e "${GREEN}Certbot installed successfully${NC}"
fi

# Create webroot directory
echo "Creating webroot directory..."
mkdir -p "$WEBROOT"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

# Check if domain resolves to this server
echo "Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me || echo "unknown")
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1 || echo "unknown")

echo "Server IP:  $SERVER_IP"
echo "Domain IP:  $DOMAIN_IP"

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo -e "${YELLOW}Warning: Domain does not appear to resolve to this server${NC}"
    echo "This may cause certificate issuance to fail."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Nginx is installed and running
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Error: Nginx is not installed${NC}"
    echo "Please install Nginx first."
    exit 1
fi

# Create temporary Nginx config for ACME challenge (if needed)
TEMP_CONFIG="/etc/nginx/sites-available/metachat-ssl-setup.conf"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Creating temporary Nginx configuration for ACME challenge..."
    cat > "$TEMP_CONFIG" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $WEBROOT;
        allow all;
    }

    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

    ln -sf "$TEMP_CONFIG" /etc/nginx/sites-enabled/metachat-ssl-setup.conf 2>/dev/null || true
    nginx -t && systemctl reload nginx
fi

# Obtain or renew certificate
echo ""
echo "========================================================================="
echo "Obtaining SSL certificate from Let's Encrypt..."
echo "========================================================================="
echo ""

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -z "$FORCE_RENEWAL" ]; then
    echo -e "${GREEN}Certificate already exists for $DOMAIN${NC}"
    echo "Certificate details:"
    certbot certificates -d "$DOMAIN"
    echo ""
    read -p "Renew certificate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        FORCE_RENEWAL="--force-renewal"
    else
        echo "Skipping certificate renewal."
        echo "To renew manually later, run: sudo certbot renew"
        exit 0
    fi
fi

# Obtain certificate
certbot certonly \
    --webroot \
    -w "$WEBROOT" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    $STAGING_FLAG \
    $FORCE_RENEWAL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL certificate obtained successfully!${NC}"
else
    echo -e "${RED}✗ Failed to obtain SSL certificate${NC}"
    echo "Please check the errors above and try again."
    exit 1
fi

# Set up automatic renewal
echo ""
echo "Setting up automatic certificate renewal..."

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Automatic renewal is configured correctly${NC}"
else
    echo -e "${YELLOW}Warning: Renewal test failed. Please check certbot configuration.${NC}"
fi

# Create renewal hook to reload Nginx
RENEWAL_HOOK="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
mkdir -p "$(dirname "$RENEWAL_HOOK")"
cat > "$RENEWAL_HOOK" <<'EOF'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
echo "$(date): Nginx reloaded after certificate renewal" >> /var/log/metachat/ssl-renewal.log
EOF

chmod +x "$RENEWAL_HOOK"
echo -e "${GREEN}✓ Renewal hook created${NC}"

# Remove temporary Nginx config
if [ -f "$TEMP_CONFIG" ]; then
    rm -f /etc/nginx/sites-enabled/metachat-ssl-setup.conf
fi

# Install production Nginx config
PROD_CONFIG="/etc/nginx/sites-available/metachat.conf"
if [ -f "infrastructure/nginx/metachat.conf" ]; then
    echo ""
    echo "Installing production Nginx configuration..."
    cp infrastructure/nginx/metachat.conf "$PROD_CONFIG"
    ln -sf "$PROD_CONFIG" /etc/nginx/sites-enabled/metachat.conf

    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx configuration updated and reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx configuration test failed${NC}"
        echo "Please check the configuration manually."
        exit 1
    fi
fi

# Display certificate information
echo ""
echo "========================================================================="
echo "SSL Certificate Information"
echo "========================================================================="
certbot certificates -d "$DOMAIN"

echo ""
echo "========================================================================="
echo "Setup Complete!"
echo "========================================================================="
echo ""
echo "Your SSL certificate has been installed and configured."
echo ""
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "Automatic renewal:    Configured (runs twice daily via systemd timer)"
echo ""
echo "Next steps:"
echo "  1. Verify HTTPS is working: https://$DOMAIN/health"
echo "  2. Check certificate: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "  3. Monitor renewal: sudo certbot certificates"
echo ""
echo "Manual renewal command: sudo certbot renew"
echo ""
echo -e "${GREEN}✓ All done!${NC}"
echo ""
