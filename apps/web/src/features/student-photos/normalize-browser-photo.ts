const MAX_AXIS = 2400;

export async function normalizeBrowserPhoto(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = sourceUrl;
    await image.decode();

    const scale = Math.min(1, MAX_AXIS / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context || canvas.width === 0 || canvas.height === 0) throw new Error('IMAGE_DECODE_FAILED');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('IMAGE_CONVERSION_FAILED'))),
        'image/jpeg',
        0.9,
      ),
    );
    const baseName = file.name.replace(/\.(?:jpe?g|png|hei[cf])$/i, '') || 'student-photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
