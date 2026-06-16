 const photoContainer = document.getElementById('photoContainer');
        const fileInput = document.getElementById('fileInput');
        const photoPreview = document.getElementById('photoPreview');
        const photoPlaceholder = document.getElementById('photoPlaceholder');

        // 2. При кліку на блок з фото програмно "клікаємо" по прихованому інпуту
        photoContainer.addEventListener('click', () => {
            fileInput.click();
        });

        // 3. Відстежуємо подію 'change' (коли користувач обрав файл у провіднику)
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0]; // Отримуємо перший обраний файл

            if (file) {
                // Створюємо тимчасове посилання на файл у пам'яті браузера
                const objectURL = URL.createObjectURL(file);
                
                // Встановлюємо це посилання як джерело (src) для тегу <img>
                photoPreview.src = objectURL;
                
                // Показуємо картинку і ховаємо текст-плейсхолдер
                photoPreview.style.display = 'block';
                photoPlaceholder.style.display = 'none';
                
                // Звільняємо пам'ять, коли картинка завантажиться
                photoPreview.onload = function() {
                    URL.revokeObjectURL(photoPreview.src);
                }
            }
        });