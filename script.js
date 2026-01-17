document.addEventListener("DOMContentLoaded", function() {
  // Check for saved dark mode preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.querySelector('.dark-mode-toggle').textContent = 'Light Mode';
  }
  var currentQRCode = null;
  
  function makeCode() {
    var elText = document.getElementById("text");
    var correctionLevel = document.getElementById("correctionLevel").value;
    
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
    
    if (!currentQRCode) {
      // Create QR code on first run
      currentQRCode = new QRCode(document.getElementById("qrcode"), {
        correctLevel: QRCode.CorrectLevel[correctionLevel],
        width: 256,
        height: 256,
        useSVG: true
      });
    } else {
      // Update correction level if changed
      currentQRCode._htOption.correctLevel = QRCode.CorrectLevel[correctionLevel];
    }
    
    // Update the existing QR code
    currentQRCode.makeCode(elText.value);
    
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
    // Create a temporary QR code to determine required version
    var tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = '0';
    tempContainer.style.height = '0';
    document.body.appendChild(tempContainer);
    
    var tempQR = new QRCode(tempContainer, {
      correctLevel: QRCode.CorrectLevel[correctionLevel],
      width: 256,
      height: 256,
      useSVG: true
    });
    
    tempQR.makeCode(text);
    
    var version = 1; // default
    if (tempQR._oQRCode) {
      version = tempQR._oQRCode.typeNumber;
    }
    
    document.body.removeChild(tempContainer);
    
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

  function downloadPng() {
    var canvas = document.querySelector("#qrcode canvas");
    if (canvas) {
      var link = document.createElement("a");
      link.download = "qrcode.png";
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  function downloadSvg() {
    var svg = document.querySelector("#qrcode svg");
    if (svg) {
      var svgString = new XMLSerializer().serializeToString(svg);
      var blob = new Blob([svgString], {type: "image/svg+xml"});
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.download = "qrcode.svg";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
        
        var blob = new Blob([svgString], {type: "image/svg+xml"});
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.download = "qrcode.svg";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
