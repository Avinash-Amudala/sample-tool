const initialImageUpload = document.getElementById("initial-image-upload");
const belowImageUpload = document.getElementById("below-image-upload");
const savePaletteButton = document.getElementById("save-palette-btn");
const belowUploadButton = document.getElementById("below-upload-image-btn");
const colorBoxes = document.querySelectorAll('.colorBox');
const copyIcons = document.querySelectorAll('.copy-icon'); // Get all copy-icons

let currentThreshold = 64;
let uploadedImage = null;
let canvas = null;
let ctx = null;

initialImageUpload.addEventListener("change", handleImageUpload);
belowImageUpload.addEventListener("change", handleImageUpload);

window.onload = function() {
    document.getElementById('save-palette-btn').style.display = 'none';
    copyIcons.forEach(icon => { icon.style.display = 'none'; });  // Hide all copy-icons
    // Hide copy-icons initially
}

document.getElementById('initial-upload-image-btn').addEventListener('click', () => {
    initialImageUpload.click();
});
savePaletteButton.addEventListener('click', function() {
    html2canvas(document.getElementById('sidebar')).then(function(canvas) {
        var link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'sample-palette.png';
        link.click();
    });
});


window.addEventListener('resize', adjustIconSize);
adjustIconSize();  // Initial adjustment

function resetColorBoxes() {
    colorBoxes.forEach(box => {
        box.style.backgroundColor = 'white';
        box.style.cursor = 'default';
        box.classList.remove('extractedColor');  // Remove the class
        copyIcons.forEach(icon => icon.classList.add('hidden'));
    });
}


function handleImageUpload(e) {
    colorBoxes.forEach(box => {
        let icon = box.querySelector('.copy-icon');
        box.removeEventListener('mouseenter', function() {
            icon.style.display = 'block';
        });
        box.removeEventListener('mouseleave', function() {
            icon.style.display = 'none';
        });
    });
    colorBoxes.forEach(box => {
        box.addEventListener('mouseenter', function() {
            this.querySelector('.copy-icon').style.display = 'block';
        });
        box.addEventListener('mouseleave', function() {
            this.querySelector('.copy-icon').style.display = 'none';
        });
    });

    // Retrieve file
    const file = e.target.files[0];
    if (!file) return;

    // Get sidebar element
    let sidebar = document.querySelector('#sidebar');

    // Hide the sidebar
    sidebar.style.visibility = 'hidden';

    // Show the spinner
    document.getElementById('spinner').style.display = 'block';

    resetColorBoxes();
    document.getElementById('initial-upload-image-btn').style.display = 'none';
    document.getElementById('uploadedImage').style.display = 'none';

    const reader = new FileReader();
    reader.onloadstart = (e) => {
        document.getElementById('spinner').style.display = 'block';
    }
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('uploadedImage').style.display = 'block';

            document.getElementById('uploadedImage').src = e.target.result;

            // UI updates
            belowUploadButton.style.display = 'block';
            colorBoxes.forEach(box => box.style.setProperty('cursor', 'pointer'));

            let style = document.createElement('style');
            style.innerHTML = '.colorBox:hover::after { display: block; }';
            document.head.appendChild(style);

            // Analyzing the image to get the colors
            analyzeImage(img);

            // Show copy-icons after the image has been analyzed and colors extracted
            copyIcons.forEach(icon => { icon.style.display = 'block'; });

            // Show the sidebar after colors are extracted
            sidebar.style.visibility = 'visible';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}


function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve(e.target.result);
            };
            img.onerror = () => {
                reject(new Error("Failed to load image"));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
function areColorsClose(color1, color2, threshold = 40) {
    let diff = Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
    return diff <= threshold;
}

function filterSimilarColors(colors) {
    let filteredColors = [];

    colors.forEach(color => {
        let isCloseToExistingColor = filteredColors.some(
            ({color: existingColor}) => areColorsClose(color.color, existingColor)
        );

        if (!isCloseToExistingColor) {
            filteredColors.push(color);
        }
    });

    return filteredColors;
}

function analyzeImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const imgElement = document.getElementById('uploadedImage');
    imgElement.src = img.src;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0, img.width, img.height);
    const colorGroups = [];
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Extracting image data here

    for (let i = 0; i < imageData.data.length; i += 16) {
        const color = [
            imageData.data[i],
            imageData.data[i + 1],
            imageData.data[i + 2],
        ];
        addToColorGroup(color, colorGroups, currentThreshold);
    }


    const averagedColorGroups = colorGroups.map(averageColorGroup);
    const sortedColors = averagedColorGroups.sort((a, b) => b.count - a.count);
    const filteredColors = filterSimilarColors(sortedColors);
    displayResults(filteredColors.slice(0, 5)); // Display only top 5 distinct colors
    //displayResults(sortedColors.slice(0, 5));
}
//document.getElementById('save-palette-btn').style.display = 'block';
//document.getElementById('save-palette-btn').addEventListener('click', function() {
//    html2canvas(document.getElementById('sidebar')).then(function(canvas) {
//        var link = document.createElement('a');
//        link.href = canvas.toDataURL('image/png');
//        link.download = 'color_palette.png';
//        link.click();
//    });
//});

function addToColorGroup(color, colorGroups, threshold) {
    for (const group of colorGroups) {
        if (isColorSimilar(color, group.color, threshold)) {
            group.colors.push(color);
            group.count += 1;
            return;
        }
    }

    colorGroups.push({ color, colors: [color], count: 1 });
}

function isColorSimilar(colorA, colorB, threshold) {
    const distance = Math.sqrt(
        Math.pow(colorA[0] - colorB[0], 2) +
        Math.pow(colorA[1] - colorB[1], 2) +
        Math.pow(colorA[2] - colorB[2], 2)
    );

    return distance <= threshold;
}

function averageColorGroup(group) {
    const colorCount = group.colors.length;
    const [r, g, b] = group.colors.reduce(
        ([r, g, b], color) => [
            r + color[0] / colorCount,
            g + color[1] / colorCount,
            b + color[2] / colorCount,
        ],
        [0, 0, 0]
    );

    return { color: [Math.round(r), Math.round(g), Math.round(b)], count: group.count };
}

function displayResults(colors) {
    let sidebar = document.getElementById("sidebar");
    // Clear the sidebar's child elements
    while (sidebar.firstChild) {
        sidebar.removeChild(sidebar.firstChild);
    }
    const imageContainer = document.getElementById("imageContainer");

    sidebar.classList.add("transparent");
    imageContainer.classList.add("transparent");
    let total = colors.reduce((acc, {count}) => acc + count, 0); // Calculate the total count of colors
    const sidebarHeight = sidebar.offsetHeight; // Get the height of the sidebar
    const maxBlockHeight = sidebarHeight / 2; // Maximum height is half the sidebar height

    colors.forEach(({ color, count }, index) => {
        if(index > 4) return; // Skip iteration if index is above 4 (for the 6th box and onwards)

        let colorBox = document.createElement("div");
        colorBox.id = `color${index+1}`;
        colorBox.className = "colorBox";
        colorBox.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        colorBox.classList.add('extractedColor');

        colorBox.addEventListener("click", () => {
            const hexColor = rgbToHex(color);
            copyToClipboard(hexColor);
            showCopiedMessage(hexColor);
        });

        // Add the copy icon to the color box
        let icon = document.createElement("div");
        icon.className = "copy-icon";
        colorBox.appendChild(icon);

        const luminance = calculateLuminance(color[0], color[1], color[2]);
        if (luminance < 0.5) {
            colorBox.classList.add("dark-bg"); // Add a CSS class for dark background
        }

        let proportion = count / total;
        let blockHeight = proportion * sidebarHeight; // Calculate the block height based on the color proportion
        blockHeight = Math.min(blockHeight, maxBlockHeight); // Limit the block height to half the sidebar height
        colorBox.style.height = `${blockHeight}px`; // Set the block height

        icon.addEventListener("click", () => {
            const hexColor = rgbToHex(color);
            copyToClipboard(hexColor);
            showCopiedMessage(hexColor);
        });

        sidebar.appendChild(colorBox); // Add the color box to the sidebar
    });


    adjustIconSize(); // Adjust the icon sizes whenever new color boxes are displayed

    // Show the "Save Palette" button after colors are displayed
    let savePaletteBtn = document.getElementById('save-palette-btn');
    if(!savePaletteBtn) {
        savePaletteBtn = document.createElement("button");
        savePaletteBtn.id = 'save-palette-btn';
        savePaletteBtn.className = 'btn';
        savePaletteBtn.innerText = 'Save Palette';
        sidebar.appendChild(savePaletteBtn);
    }
    savePaletteBtn.style.display = 'block';

    // Show the "Upload Another Image" button after colors are displayed
    document.getElementById('below-upload-image-btn').style.display = 'flex';

    savePaletteBtn.addEventListener('click', function() {
        // ... SVG creation and download code goes here ..
//        console.log('button working!')
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "1000");

        let colorBoxes = Array.from(document.querySelectorAll('.colorBox'));
        let minHeight = 32;
        let svgHeight = 1000;
        let totalHeight = 0;

        let colorData = colorBoxes.map((box) => {
            let height = parseFloat(box.style.height);
            totalHeight += height;
            return { box, height };
        });

        let smallColors = colorData.filter(({ height }) => height / totalHeight * svgHeight < minHeight);
        let largeColors = colorData.filter(({ height }) => height / totalHeight * svgHeight >= minHeight);

        let smallColorsTotalHeight = smallColors.length * minHeight;
        let remainingHeight = svgHeight - smallColorsTotalHeight;

        let largeColorsTotalHeight = largeColors.reduce((sum, { height }) => sum + height, 0);

        // Sort by height in descending order
        largeColors.sort((a, b) => b.height - a.height);

        let cumulativeHeight = 0;
        for (let { box, height } of largeColors) {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", 0);
            rect.setAttribute("y", cumulativeHeight);

            let proportion = height / largeColorsTotalHeight;
            let blockHeight = proportion * remainingHeight;

            cumulativeHeight += blockHeight;
            rect.setAttribute("height", `${blockHeight}`);
            rect.setAttribute("width", "200");
            rect.setAttribute("fill", box.style.backgroundColor);
            svg.appendChild(rect);
        }

        for (let { box } of smallColors) {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", 0);
            rect.setAttribute("y", cumulativeHeight);

            cumulativeHeight += minHeight;
            rect.setAttribute("height", `${minHeight}`);
            rect.setAttribute("width", "200");
            rect.setAttribute("fill", box.style.backgroundColor);
            svg.appendChild(rect);
        }

        let serializer = new XMLSerializer();
        let svgBlob = new Blob([serializer.serializeToString(svg)], {type: 'image/svg+xml'});
        let url = URL.createObjectURL(svgBlob);
        let link = document.createElement('a');
        link.href = url;
        link.download = 'sample-palette.svg';
        link.click();
    });

}

function calculateLuminance(red, green, blue) {
    const sRGB = [red / 255, green / 255, blue / 255];
    const sRGBAdjusted = sRGB.map((channel) => {
        if (channel <= 0.03928) {
            return channel / 12.92;
        } else {
            return Math.pow((channel + 0.055) / 1.055, 2.4);
        }
    })

    const [r, g, b] = sRGBAdjusted;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;

}

    function copyToClipboard(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showCopiedMessage(text);
    }

    function showCopiedMessage(text) {
        const message = document.getElementById("copiedMessage");
        message.innerText = `${text} copied to clipboard!`;

        // Make the message visible
        message.style.opacity = 1;

        // Hide the message after 2 seconds
        setTimeout(() => {
            message.style.opacity = 0;
        }, 2000);
    }
    function rgbToHex([r, g, b]) {
        return (
                "#" +
                [r, g, b]
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("")
                );
    }

    function rgbToHsl([r, g, b]){
        r /= 255, g /= 255, b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if(max === min){
            h = s = 0; // achromatic
        }else{
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, l * 100];
    }

    function isColorSimilar(colorA, colorB, threshold) {
        const hslA = rgbToHsl(colorA);
        const hslB = rgbToHsl(colorB);

        const distance = Math.sqrt(
                                   Math.pow(hslA[0] - hslB[0], 2) +
                                   Math.pow(hslA[1] - hslB[1], 2) +
                                   Math.pow(hslA[2] - hslB[2], 2)
                                   );

        return distance <= threshold;
    }
    function adjustIconSize() {
        const copyIcons = document.querySelectorAll('.copy-icon');
        const iconSize = 64;
        for (const icon of copyIcons) {
            icon.style.width = iconSize + 'px';
            icon.style.height = iconSize + 'px';
        }
    }
//document.addEventListener('keydown', function(e) {
//    if (e.key === 's') {
//        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//        let colorBoxes = document.querySelectorAll('.colorBox');
//        colorBoxes.forEach((box, i) => {
//            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//            rect.setAttribute("x", 0);
//            rect.setAttribute("y", i * 100); // Adjust as needed
//            rect.setAttribute("width", 100); // Adjust as needed
//            rect.setAttribute("height", 100); // Adjust as needed
//            rect.setAttribute("fill", box.style.backgroundColor);
//            svg.appendChild(rect);
//        });
//        let serializer = new XMLSerializer();
//        let svgBlob = new Blob([serializer.serializeToString(svg)], {type: 'image/svg+xml'});
//        let url = URL.createObjectURL(svgBlob);
//        let link = document.createElement('a');
//        link.href = url;
//        link.download = 'color_palette.svg';
//        link.click();
//    }
//});


document.addEventListener('keydown', function(e) {
    if (e.key === 's') {
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "1000");

        let colorBoxes = Array.from(document.querySelectorAll('.colorBox'));
        let minHeight = 32;
        let svgHeight = 1000;
        let totalHeight = 0;

        let colorData = colorBoxes.map((box) => {
            let height = parseFloat(box.style.height);
            totalHeight += height;
            return { box, height };
        });

        let smallColors = colorData.filter(({ height }) => height / totalHeight * svgHeight < minHeight);
        let largeColors = colorData.filter(({ height }) => height / totalHeight * svgHeight >= minHeight);

        let smallColorsTotalHeight = smallColors.length * minHeight;
        let remainingHeight = svgHeight - smallColorsTotalHeight;

        let largeColorsTotalHeight = largeColors.reduce((sum, { height }) => sum + height, 0);

        // Sort by height in descending order
        largeColors.sort((a, b) => b.height - a.height);

        let cumulativeHeight = 0;
        for (let { box, height } of largeColors) {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", 0);
            rect.setAttribute("y", cumulativeHeight);

            let proportion = height / largeColorsTotalHeight;
            let blockHeight = proportion * remainingHeight;

            cumulativeHeight += blockHeight;
            rect.setAttribute("height", `${blockHeight}`);
            rect.setAttribute("width", "200");
            rect.setAttribute("fill", box.style.backgroundColor);
            svg.appendChild(rect);
        }

        for (let { box } of smallColors) {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", 0);
            rect.setAttribute("y", cumulativeHeight);

            cumulativeHeight += minHeight;
            rect.setAttribute("height", `${minHeight}`);
            rect.setAttribute("width", "200");
            rect.setAttribute("fill", box.style.backgroundColor);
            svg.appendChild(rect);
        }

        let serializer = new XMLSerializer();
        let svgBlob = new Blob([serializer.serializeToString(svg)], {type: 'image/svg+xml'});
        let url = URL.createObjectURL(svgBlob);
        let link = document.createElement('a');
        link.href = url;
        link.download = 'color_palette.svg';
        link.click();
    }
});

//let savePaletteButton = document.getElementById('save-palette-btn');

//savePaletteButton.addEventListener('click', function() {
//    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//    svg.setAttribute("width", "200");
//    svg.setAttribute("height", "1000");
//
//    let colorBoxes = Array.from(document.querySelectorAll('.colorBox'));
//    let minHeight = 32;
//    let svgHeight = 1000;
//    let totalHeight = 0;
//
//    let colorData = colorBoxes.map((box) => {
//        let height = parseFloat(box.style.height);
//        totalHeight += height;
//        return { box, height };
//    });
//
//    let smallColors = colorData.filter(({ height }) => height / totalHeight * svgHeight < minHeight);
//    let largeColors = colorData.filter(({ height }) => height / totalHeight * svgHeight >= minHeight);
//
//    let smallColorsTotalHeight = smallColors.length * minHeight;
//    let remainingHeight = svgHeight - smallColorsTotalHeight;
//
//    let largeColorsTotalHeight = largeColors.reduce((sum, { height }) => sum + height, 0);
//
//    // Sort by height in descending order
//    largeColors.sort((a, b) => b.height - a.height);
//
//    let cumulativeHeight = 0;
//    for (let { box, height } of largeColors) {
//        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//        rect.setAttribute("x", 0);
//        rect.setAttribute("y", cumulativeHeight);
//
//        let proportion = height / largeColorsTotalHeight;
//        let blockHeight = proportion * remainingHeight;
//
//        cumulativeHeight += blockHeight;
//        rect.setAttribute("height", `${blockHeight}`);
//        rect.setAttribute("width", "200");
//        rect.setAttribute("fill", box.style.backgroundColor);
//        svg.appendChild(rect);
//    }
//
//    for (let { box } of smallColors) {
//        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//        rect.setAttribute("x", 0);
//        rect.setAttribute("y", cumulativeHeight);
//
//        cumulativeHeight += minHeight;
//        rect.setAttribute("height", `${minHeight}`);
//        rect.setAttribute("width", "200");
//        rect.setAttribute("fill", box.style.backgroundColor);
//        svg.appendChild(rect);
//    }
//
//    let serializer = new XMLSerializer();
//    let svgBlob = new Blob([serializer.serializeToString(svg)], {type: 'image/svg+xml'});
//    let url = URL.createObjectURL(svgBlob);
//    let link = document.createElement('a');
//    link.href = url;
//    link.download = 'color_palette.svg';
//    link.click();
//});

// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementsByClassName("about")[0];

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// Get the button that closes the modal
var getStartedButton = document.getElementById("getStartedButton");

// When the user clicks on the button, close the modal
getStartedButton.onclick = function() {
  modal.style.display = "none";
}
