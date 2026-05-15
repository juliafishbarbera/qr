document.addEventListener("DOMContentLoaded", function() {
  // Check for saved dark mode preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.querySelector('.dark-mode-toggle').textContent = 'Light Mode';
  }
  var currentQRCode = null;
  var qrMeasureContainer = document.createElement('div');
  qrMeasureContainer.style.position = 'absolute';
  qrMeasureContainer.style.visibility = 'hidden';
  qrMeasureContainer.style.width = '0';
  qrMeasureContainer.style.height = '0';
  qrMeasureContainer.style.overflow = 'hidden';
  document.body.appendChild(qrMeasureContainer);
  var qrOptions = {
    colorDark: '#000000',
    colorLight: '#ffffff',
    moduleShape: 'square',
    size: 256,
    transparentBackground: false
  };

  function syncOptionsFromControls() {
    qrOptions.colorDark = document.getElementById('foregroundColor').value;
    qrOptions.colorLight = document.getElementById('backgroundColor').value;
    qrOptions.moduleShape = document.getElementById('moduleShape').value;
    qrOptions.size = parseInt(document.getElementById('qrSize').value, 10);
    qrOptions.transparentBackground = document.getElementById('transparentBackground').checked;
  }

  function renderCustomSvg(qrData) {
    var container = document.getElementById('qrcode');
    var moduleCount = qrData.getModuleCount();
    var pieces = [];
    var x;
    var y;

    container.style.width = qrOptions.size + 'px';
    container.style.height = qrOptions.size + 'px';
    container.innerHTML = '';

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
    container.innerHTML = pieces.join('');
  }

  function buildQRCodeData(text, correctLevel) {
    qrMeasureContainer.innerHTML = '';
    currentQRCode = new QRCode(qrMeasureContainer, {
      text: text,
      correctLevel: QRCode.CorrectLevel[correctLevel],
      width: qrOptions.size,
      height: qrOptions.size,
      colorDark: qrOptions.colorDark,
      colorLight: qrOptions.colorLight,
      useSVG: true
    });

    return currentQRCode._oQRCode;
  }

  function downloadDataUrl(filename, dataUrl) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  function getSerializedSvg() {
    var svg = document.querySelector('#qrcode svg');
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
    var elText = document.getElementById("text");
    var correctionLevel = document.getElementById("correctionLevel").value;
    syncOptionsFromControls();
    
    if (correctionLevel === 'AUTO') {
      correctionLevel = findOptimalCorrectionLevel(elText.value);
      // Update display to show actual level being used
      var select = document.getElementById("correctionLevel");
      var autoOption = select.querySelector('option[value="AUTO"]');
      autoOption.text = 'Auto (' + correctionLevel + ')';
    } else {
      // Reset auto option text
      var select = document.getElementById("correctionLevel");
      var autoOption = select.querySelector('option[value="AUTO"]');
      autoOption.text = 'Auto';
    }
    
    var qrData = buildQRCodeData(elText.value, correctionLevel);
    renderCustomSvg(qrData);
    
    // Update version and module info
    updateQRInfo(currentQRCode);
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

  var textInput = document.getElementById("text");
  textInput.addEventListener("input", makeCode);
  textInput.addEventListener("blur", makeCode);
  textInput.addEventListener("keydown", function (e) {
    if (e.keyCode == 13) {
      makeCode();
    }
  });

  var correctionSelect = document.getElementById("correctionLevel");
  correctionSelect.addEventListener("change", makeCode);
  document.getElementById('moduleShape').addEventListener('change', makeCode);
  document.getElementById('foregroundColor').addEventListener('input', makeCode);
  document.getElementById('backgroundColor').addEventListener('input', makeCode);
  document.getElementById('qrSize').addEventListener('change', makeCode);
  document.getElementById('transparentBackground').addEventListener('change', makeCode);

  function downloadPng() {
    var svgString = getSerializedSvg();
    if (svgString) {
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
        downloadDataUrl('qrcode.png', canvas.toDataURL('image/png'));
      };

      image.src = url;
    }
  }

  function downloadSvg() {
    var svgString = getSerializedSvg();
    if (svgString) {
      downloadSvgString(svgString, 'qrcode.svg');
    } else {
      // Fallback: generate SVG from canvas
      var canvas = document.querySelector("#qrcode canvas");
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

  function updateQRInfo(qrcode) {
    // Get QR code version and module count from the internal data
    if (qrcode._oQRCode) {
      var version = qrcode._oQRCode.typeNumber;
      var modules = qrcode._oQRCode.moduleCount;
      document.getElementById("qrVersion").textContent = version;
      document.getElementById("qrModules").textContent = modules + "×" + modules;
    } else {
      // Fallback: try to determine from the rendered element
      setTimeout(function() {
        var svg = document.querySelector("#qrcode svg");
        var canvas = document.querySelector("#qrcode canvas");
        
        if (svg) {
          var viewBox = svg.getAttribute('viewBox');
          if (viewBox) {
            var dimensions = viewBox.split(' ');
            var width = parseInt(dimensions[2]);
            var version = Math.ceil((width - 17) / 4);
            var modules = version * 4 + 17;
            document.getElementById("qrVersion").textContent = version;
            document.getElementById("qrModules").textContent = modules + "×" + modules;
          }
        } else if (canvas) {
          var modules = Math.floor(canvas.width / 8);
          var version = Math.ceil((modules - 17) / 4);
          document.getElementById("qrVersion").textContent = version;
          document.getElementById("qrModules").textContent = modules + "×" + modules;
        }
      }, 100);
    }
  }

  document.getElementById("downloadPng").addEventListener("click", downloadPng);
  document.getElementById("downloadSvg").addEventListener("click", downloadSvg);
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
