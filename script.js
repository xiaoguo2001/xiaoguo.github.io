// ===== 获取页面元素 =====
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const preview = document.getElementById('preview');
const imageInfo = document.getElementById('imageInfo');
const compressBtn = document.getElementById('compressBtn');
const compressArea = document.querySelector('.compress-area');
const compressInfo = document.querySelector('.compress-info');
const qualitySelect = document.getElementById('quality');
const colorMode = document.getElementById('colorMode');
const uploadArea = document.querySelector('.upload-area');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const batchProgress = document.querySelector('.batch-progress');
const batchStatus = document.querySelector('.batch-status');
const batchResult = document.querySelector('.batch-result');
const downloadAllBtn = document.getElementById('downloadAll');

let currentZip = null; // 存储当前的ZIP对象

// ===== 处理单张图片上传和预览 =====
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // 重置界面
        resetUI();
        
        // 显示文件信息
        imageInfo.textContent = `原始大小: ${(file.size / 1024).toFixed(2)} KB`;
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
        
        // 显示压缩控制区域
        compressArea.style.display = 'block';
        compressBtn.style.display = 'block';
        batchProgress.style.display = 'none';
        batchResult.style.display = 'none';
    }
});

// ===== 处理文件夹上传 =====
folderInput.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
        alert('未找到图片文件');
        return;
    }

    // 重置界面
    resetUI();
    
    // 显示处理区域
    compressArea.style.display = 'block';
    compressBtn.style.display = 'none';
    batchProgress.style.display = 'block';
    batchStatus.textContent = `准备处理: 0/${files.length}`;
    
    // 创建新的ZIP对象
    currentZip = new JSZip();
    const compressedFiles = [];
    let processed = 0;

    for (const file of files) {
        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                quality: parseFloat(qualitySelect.value),
                ...getColorOptions(colorMode.value)
            };

            const compressedFile = await imageCompression(file, options);
            
            // 保持原始文件夹结构
            const relativePath = file.webkitRelativePath || file.name;
            currentZip.file(relativePath, compressedFile);
            
            compressedFiles.push({
                original: file,
                compressed: compressedFile
            });

            processed++;
            batchStatus.textContent = `正在处理: ${processed}/${files.length}`;
            progress.style.width = (processed / files.length * 100) + '%';

        } catch (error) {
            console.error(`处理文件 ${file.name} 时出错:`, error);
        }
    }

    // 显示总体压缩结果
    const totalOriginalSize = compressedFiles.reduce((sum, file) => 
        sum + file.original.size, 0);
    const totalCompressedSize = compressedFiles.reduce((sum, file) => 
        sum + file.compressed.size, 0);

    compressInfo.textContent = `
        处理完成 ${processed} 个文件
        总原始大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB
        压缩后大小: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB
        总压缩率: ${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(2)}%
    `;

    batchResult.style.display = 'block';
});

// ===== 拖拽上传功能 =====
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
        if (items[0].webkitGetAsEntry().isDirectory) {
            // 如果是文件夹，触发文件夹输入
            folderInput.click();
        } else {
            // 如果是单个文件
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        }
    }
});

// ===== 色彩模式选项 =====
const getColorOptions = (mode) => {
    switch(mode) {
        case 'high':
            return {
                preserveExif: true,
                alwaysKeepResolution: true,
                initialQuality: 0.9
            };
        case 'normal':
            return {
                preserveExif: true,
                alwaysKeepResolution: true,
                initialQuality: 0.8
            };
        case 'low':
            return {
                preserveExif: false,
                alwaysKeepResolution: false,
                initialQuality: 0.6
            };
    }
};

// ===== 压缩功能 =====
compressBtn.addEventListener('click', async function() {
    const file = fileInput.files[0];
    if (!file) return;

    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        quality: parseFloat(qualitySelect.value),
        ...getColorOptions(colorMode.value),
        onProgress: (percent) => {
            progressBar.style.display = 'block';
            progress.style.width = percent + '%';
        }
    };

    try {
        compressBtn.disabled = true;
        compressBtn.textContent = '压缩中...';
        
        const compressedFile = await imageCompression(file, options);
        
        compressInfo.textContent = `
            原始大小: ${(file.size / 1024).toFixed(2)} KB
            压缩后大小: ${(compressedFile.size / 1024).toFixed(2)} KB
            压缩率: ${(100 - (compressedFile.size / file.size) * 100).toFixed(2)}%
        `;

        // 创建下载链接
        const downloadUrl = URL.createObjectURL(compressedFile);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'compressed-' + file.name;
        a.textContent = '下载压缩后的图片';
        a.className = 'download-btn';
        compressInfo.appendChild(document.createElement('br'));
        compressInfo.appendChild(a);

    } catch (error) {
        compressInfo.textContent = '压缩失败，请重试';
        console.error(error);
    } finally {
        progressBar.style.display = 'none';
        compressBtn.disabled = false;
        compressBtn.textContent = '压缩图片';
    }
});

// ===== 批量下载功能 =====
downloadAllBtn.addEventListener('click', async function() {
    if (!currentZip) return;

    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = '正在生成压缩包...';

    try {
        const content = await currentZip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed-images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('生成压缩包时出错:', error);
        alert('生成压缩包失败，请重试');
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = '下载所有压缩图片';
    }
});

// ===== 辅助函数 =====
function resetUI() {
    preview.style.display = 'none';
    preview.src = '';
    imageInfo.textContent = '';
    compressInfo.textContent = '';
    progress.style.width = '0%';
    currentZip = null;
    
    // 移除之前的下载按钮
    const oldDownloadBtn = compressInfo.querySelector('.download-btn');
    if (oldDownloadBtn) {
        oldDownloadBtn.remove();
    }
}