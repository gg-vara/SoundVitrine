# Build vendors with only prod dependencies
FROM composer:2 AS vendor-builder

WORKDIR /app

# Copy only files needed to install dependencies
COPY ./files/composer.json ./files/composer.lock ./

# Install only production dependencies
RUN composer install --no-dev --optimize-autoloader

##
##
##

# https://frankenphp.dev/docs/docker/
# note: prefer non-alpine for compatibility and performance (https://frankenphp.dev/fr/docs/performance/)
FROM dunglas/frankenphp:1-php8.3.36-alpine AS runner
RUN install-php-extensions \
	intl

# "empty" so we can debug it on all local loops (127.0.0.1, localhost, 0.0.0.0)
ENV SERVER_NAME=""

COPY ./files /app/public
COPY --from=vendor-builder /app/vendor /app/public/vendor
COPY ./Caddyfile /etc/frankenphp/Caddyfile

# can be overriden
ENV SOUNDVITRINE_STATE_PATH="/app/_state"

# would otherwise resort to check for Caddy admin API on port "2019", which might be disabled
HEALTHCHECK CMD curl -f http://localhost/healthz || exit 1

##
##
##

#
FROM runner AS runtime-xdebug
RUN install-php-extensions \
	xdebug
RUN echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo "xdebug.client_host=host.docker.internal" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
	&& echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

#
#
#

# must be last, as default stage to be built if not selecting a specific target
FROM runner
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"