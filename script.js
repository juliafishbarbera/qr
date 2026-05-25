document.addEventListener("DOMContentLoaded", function() {
  var textInput = document.getElementById('text');
  var correctionSelect = document.getElementById('correctionLevel');
  var moduleShapeSelect = document.getElementById('moduleShape');
  var foregroundColorInput = document.getElementById('foregroundColor');
  var backgroundColorInput = document.getElementById('backgroundColor');
  var qrSizeSelect = document.getElementById('qrSize');
  var transparentBackgroundInput = document.getElementById('transparentBackground');
  var resetAdvancedButton = document.getElementById('resetAdvanced');
  var urlWarning = document.getElementById('urlWarning');
  var qrcodeContainer = document.getElementById('qrcode');
  var qrVersion = document.getElementById('qrVersion');
  var qrModules = document.getElementById('qrModules');
  var copyPngButton = document.getElementById('copyPng');
  var downloadPngButton = document.getElementById('downloadPng');
  var downloadSvgButton = document.getElementById('downloadSvg');
  var advancedOptions = document.querySelector('.advanced-options');
  var downloadActions = document.querySelector('.download-actions');
  var qrMeta = document.querySelector('.qr-meta');
  var divider = document.querySelector('hr');

  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.querySelector('.dark-mode-toggle').textContent = 'Light Mode';
  }
  var defaultQrOptions = {
    colorDark: '#000000',
    colorLight: '#ffffff',
    moduleShape: 'square',
    size: 256,
    transparentBackground: false
  };
  var qrMeasureContainer = document.createElement('div');
  qrMeasureContainer.style.position = 'absolute';
  qrMeasureContainer.style.visibility = 'hidden';
  qrMeasureContainer.style.width = '0';
  qrMeasureContainer.style.height = '0';
  qrMeasureContainer.style.overflow = 'hidden';
  document.body.appendChild(qrMeasureContainer);
  var qrOptions = {
    colorDark: defaultQrOptions.colorDark,
    colorLight: defaultQrOptions.colorLight,
    moduleShape: defaultQrOptions.moduleShape,
    size: defaultQrOptions.size,
    transparentBackground: defaultQrOptions.transparentBackground
  };

  function isMobileLayout() {
    return window.matchMedia('(max-width: 700px)').matches;
  }

  function canSharePng() {
    return isMobileLayout() && !!navigator.share && typeof File !== 'undefined';
  }

  function updateExportActionMode() {
    var canCopyPng = !!navigator.clipboard && typeof ClipboardItem !== 'undefined';

    if (canSharePng()) {
      copyPngButton.hidden = false;
      copyPngButton.textContent = 'Share PNG';
      return;
    }

    copyPngButton.textContent = 'Copy PNG';
    copyPngButton.hidden = !canCopyPng;
  }

  function updateResetAdvancedVisibility() {
    var isDirty = qrOptions.colorDark !== defaultQrOptions.colorDark ||
      qrOptions.colorLight !== defaultQrOptions.colorLight ||
      qrOptions.moduleShape !== defaultQrOptions.moduleShape ||
      qrOptions.size !== defaultQrOptions.size ||
      qrOptions.transparentBackground !== defaultQrOptions.transparentBackground;

    resetAdvancedButton.hidden = !isDirty;
  }

  function resetAdvancedOptions() {
    foregroundColorInput.value = defaultQrOptions.colorDark;
    backgroundColorInput.value = defaultQrOptions.colorLight;
    moduleShapeSelect.value = defaultQrOptions.moduleShape;
    qrSizeSelect.value = String(defaultQrOptions.size);
    transparentBackgroundInput.checked = defaultQrOptions.transparentBackground;
    makeCode();
  }

  function syncOptionsFromControls() {
    qrOptions.colorDark = foregroundColorInput.value;
    qrOptions.colorLight = backgroundColorInput.value;
    qrOptions.moduleShape = moduleShapeSelect.value;
    qrOptions.size = parseInt(qrSizeSelect.value, 10);
    qrOptions.transparentBackground = transparentBackgroundInput.checked;
  }

  function updateUrlWarning(text) {
    var hasHttpProtocol = /^https?:\/\//i.test(text);
    var looksLikeDomain = /(?:^|\s|\()([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?=[:/\s)|]|$)/i.test(text.trim());

    urlWarning.hidden = hasHttpProtocol || !looksLikeDomain;
  }

  function renderCustomSvg(qrData) {
    var moduleCount = qrData.getModuleCount();
    var pieces = [];
    var x;
    var y;

    qrcodeContainer.style.height = 'auto';
    qrcodeContainer.style.maxWidth = '100%';
    qrcodeContainer.innerHTML = '';

    pieces.push(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + moduleCount + ' ' + moduleCount + '" width="100%" height="100%">'
    );

    if (!qrOptions.transparentBackground) {
      pieces.push(
        '<rect width="' + moduleCount + '" height="' + moduleCount + '" fill="' + qrOptions.colorLight + '"/>'
      );
    }

    if (qrOptions.moduleShape === 'circle') {
      for (y = 0; y < moduleCount; y++) {
        for (x = 0; x < moduleCount; x++) {
          if (qrData.isDark(y, x)) {
            pieces.push(
              '<circle cx="' + (x + 0.5) + '" cy="' + (y + 0.5) + '" r="0.45" fill="' + qrOptions.colorDark + '"/>'
            );
          }
        }
      }
    } else {
      for (y = 0; y < moduleCount; y++) {
        for (x = 0; x < moduleCount; x++) {
          if (qrData.isDark(y, x)) {
            pieces.push(
              '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + qrOptions.colorDark + '"/>'
            );
          }
        }
      }
    }

    pieces.push('</svg>');
    qrcodeContainer.innerHTML = pieces.join('');
    updatePreviewSize();
  }

  function updatePreviewSize() {
    var containerTop = qrcodeContainer.getBoundingClientRect().top;
    var bodyStyles = window.getComputedStyle(document.body);
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var availableWidth = Math.min(qrcodeContainer.parentElement.clientWidth, viewportWidth - 24);
    var reservedHeight = downloadActions.offsetHeight + qrMeta.offsetHeight + divider.offsetHeight + 40;
    var availableHeight = viewportHeight - containerTop - reservedHeight - (parseFloat(bodyStyles.paddingBottom) || 0);
    var previewSize = Math.min(availableWidth, availableHeight, qrOptions.size);

    if (!isFinite(previewSize) || previewSize <= 0) {
      previewSize = Math.min(availableWidth, qrOptions.size);
    }

    qrcodeContainer.style.width = Math.max(140, previewSize) + 'px';
  }

  function buildQRCodeData(text, correctLevel) {
    qrMeasureContainer.innerHTML = '';
    var qrCode = new QRCode(qrMeasureContainer, {
      text: text,
      correctLevel: QRCode.CorrectLevel[correctLevel],
      width: qrOptions.size,
      height: qrOptions.size,
      colorDark: qrOptions.colorDark,
      colorLight: qrOptions.colorLight,
      useSVG: true
    });

    return qrCode._oQRCode;
  }

  function downloadDataUrl(filename, dataUrl) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  function getSerializedSvg() {
    var svg = qrcodeContainer.querySelector('svg');
    if (!svg) {
      return null;
    }

    return new XMLSerializer().serializeToString(svg);
  }

  function downloadSvgString(svgString, filename) {
    var blob = new Blob([svgString], {type: 'image/svg+xml'});
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  function makeCode() {
    var text = textInput.value;
    var correctionLevel = correctionSelect.value;
    syncOptionsFromControls();
    updateResetAdvancedVisibility();
    updateUrlWarning(text);
    
    if (correctionLevel === 'AUTO') {
      var autoOption = correctionSelect.querySelector('option[value="AUTO"]');
      correctionLevel = findOptimalCorrectionLevel(text);
      autoOption.text = 'Auto (' + correctionLevel + ')';
    } else {
      correctionSelect.querySelector('option[value="AUTO"]').text = 'Auto';
    }
    
    var qrData = buildQRCodeData(text, correctionLevel);
    renderCustomSvg(qrData);
    updateQRInfo(qrData);
  }
  
  function findOptimalCorrectionLevel(text) {
    var levels = ['L', 'M', 'Q', 'H'];
    var baseVersion = null;
    var bestLevel = 'L';
    
    // Find the version required at each correction level
    for (var i = 0; i < levels.length; i++) {
      var version = getRequiredVersion(text, levels[i]);
      if (i === 0) {
        baseVersion = version;
        bestLevel = levels[i];
      } else if (version === baseVersion) {
        bestLevel = levels[i];
      } else {
        break;
      }
    }
    
    return bestLevel;
  }
  
  function getRequiredVersion(text, correctionLevel) {
    var tempQR = buildQRCodeData(text, correctionLevel);
    
    var version = 1; // default
    if (tempQR) {
      version = tempQR.typeNumber;
    }

    return version;
  }

  makeCode();

  function downloadPng() {
    renderPngCanvas(function (canvas) {
      downloadDataUrl('qrcode.png', canvas.toDataURL('image/png'));
    });
  }

  function renderPngCanvas(callback) {
    var svgString = getSerializedSvg();
    if (!svgString) {
      return;
    }

    var image = new Image();
    var blob = new Blob([svgString], {type: 'image/svg+xml'});
    var url = URL.createObjectURL(blob);

    image.onload = function() {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');

      canvas.width = qrOptions.size;
      canvas.height = qrOptions.size;

      if (!qrOptions.transparentBackground) {
        context.fillStyle = qrOptions.colorLight;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      callback(canvas);
    };

    image.src = url;
  }

  function copyPng() {
    if (canSharePng()) {
      sharePng();
      return;
    }

    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return;
    }

    renderPngCanvas(function (canvas) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          return;
        }

        navigator.clipboard.write([
          new ClipboardItem({'image/png': blob})
        ]).catch(function () {
        });
      }, 'image/png');
    });
  }

  function sharePng() {
    if (!canSharePng()) {
      return;
    }

    renderPngCanvas(function (canvas) {
      canvas.toBlob(function (blob) {
        var file;

        if (!blob) {
          return;
        }

        file = new File([blob], 'qrcode.png', {type: 'image/png'});

        if (navigator.canShare && !navigator.canShare({files: [file]})) {
          return;
        }

        navigator.share({
          files: [file],
          title: 'QR Code PNG'
        }).catch(function () {
        });
      }, 'image/png');
    });
  }

  function downloadSvg() {
    var svgString = getSerializedSvg();
    if (svgString) {
      downloadSvgString(svgString, 'qrcode.svg');
    } else {
      // Fallback: generate SVG from canvas
      var canvas = qrcodeContainer.querySelector('canvas');
      if (canvas) {
        var ctx = canvas.getContext("2d");
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var moduleSize = 8;
        var rects = [];
        
        for (var y = 0; y < canvas.height; y += moduleSize) {
          for (var x = 0; x < canvas.width; x += moduleSize) {
            var index = (y * canvas.width + x) * 4;
            var r = imageData.data[index];
            var g = imageData.data[index + 1];
            var b = imageData.data[index + 2];
            var a = imageData.data[index + 3];
            
            if (a > 0 && r < 128 && g < 128 && b < 128) {
              rects.push('<rect x="' + x + '" y="' + y + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="black"/>');
            }
          }
        }
        
        var svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="' + canvas.width + '" height="' + canvas.height + '" viewBox="0 0 ' + canvas.width + ' ' + canvas.height + '">' + rects.join('') + '</svg>';
        downloadSvgString(svgString, 'qrcode.svg');
      }
    }
  }

  function updateQRInfo(qrData) {
    if (qrData) {
      qrVersion.textContent = qrData.typeNumber;
      qrModules.textContent = qrData.moduleCount + '×' + qrData.moduleCount;
    } else {
      setTimeout(function() {
        var svg = qrcodeContainer.querySelector('svg');
        var canvas = qrcodeContainer.querySelector('canvas');
        
        if (svg) {
          var viewBox = svg.getAttribute('viewBox');
          if (viewBox) {
            var dimensions = viewBox.split(' ');
            var width = parseInt(dimensions[2]);
            var version = Math.ceil((width - 17) / 4);
            var modules = version * 4 + 17;
            qrVersion.textContent = version;
            qrModules.textContent = modules + '×' + modules;
          }
        } else if (canvas) {
          var modules = Math.floor(canvas.width / 8);
          var version = Math.ceil((modules - 17) / 4);
          qrVersion.textContent = version;
          qrModules.textContent = modules + '×' + modules;
        }
      }, 100);
    }
  }

  downloadPngButton.addEventListener('click', downloadPng);
  copyPngButton.addEventListener('click', copyPng);
  downloadSvgButton.addEventListener('click', downloadSvg);
  advancedOptions.addEventListener('toggle', updatePreviewSize);
  window.addEventListener('resize', function () {
    updatePreviewSize();
    updateExportActionMode();
  });

  textInput.addEventListener('input', makeCode);
  textInput.addEventListener('blur', makeCode);
  textInput.addEventListener('keydown', function (e) {
    if (e.keyCode == 13) {
      makeCode();
    }
  });

  correctionSelect.addEventListener('change', makeCode);
  moduleShapeSelect.addEventListener('change', makeCode);
  foregroundColorInput.addEventListener('input', makeCode);
  backgroundColorInput.addEventListener('input', makeCode);
  qrSizeSelect.addEventListener('change', makeCode);
  transparentBackgroundInput.addEventListener('change', makeCode);
  resetAdvancedButton.addEventListener('click', resetAdvancedOptions);

  updateExportActionMode();
  updateResetAdvancedVisibility();
  });

function toggleDarkMode() {
  var body = document.body;
  var toggle = document.querySelector('.dark-mode-toggle');
  
  body.classList.toggle('dark-mode');
  
  if (body.classList.contains('dark-mode')) {
    localStorage.setItem('darkMode', 'true');
    toggle.textContent = 'Light Mode';
  } else {
    localStorage.setItem('darkMode', 'false');
    toggle.textContent = 'Dark Mode';
  }
}
