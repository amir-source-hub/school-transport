export function requestCurrentLocation(): Promise<GeolocationCoordinates> {
  if (window.isSecureContext === false) {
    return Promise.reject(new Error('دریافت موقعیت فقط در اتصال امن HTTPS کار می‌کند. صفحه را با نشانی امن باز کنید.'));
  }
  if (!navigator.geolocation) {
    return Promise.reject(new Error('مرورگر شما امکان دریافت موقعیت مکانی را ندارد.'));
  }
  return new Promise((resolve, reject) => {
    const failed = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        reject(new Error('دسترسی موقعیت مکانی قبلاً مسدود شده است. روی نماد قفل یا تنظیمات کنار نشانی سایت بزنید، «موقعیت مکانی» را مجاز کنید و صفحه را دوباره بارگذاری کنید. همچنین می‌توانید نشانگر را روی نقشه جابه‌جا کنید.'));
      } else {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve(coords),
          () => reject(new Error('موقعیت دریافت نشد. مکان‌یاب دستگاه را روشن کنید یا نشانگر را روی نقشه جابه‌جا کنید.')),
          { enableHighAccuracy: false, timeout: 20_000, maximumAge: 0 },
        );
      }
    };
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      failed,
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 },
    );
  });
}
