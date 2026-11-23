// Comprime una foto en el celular antes de enviarla: máximo 1280 px y ~200 KB en WebP/JPEG.
export async function comprimirFoto(archivo: File, ladoMax = 1280, calidad = 0.75): Promise<string> {
    if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
    if (archivo.size > 15 * 1024 * 1024) throw new Error('La foto es demasiado grande (máximo 15 MB).');
    const bitmap = await createImageBitmap(archivo).catch(() => {
        throw new Error('No se pudo leer la foto. Prueba con otra imagen JPG o PNG.');
    });
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let url = canvas.toDataURL('image/webp', calidad);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', calidad);
    if (url.length > 1_300_000) url = canvas.toDataURL('image/jpeg', 0.5);
    return url;
}
