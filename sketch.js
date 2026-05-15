await Canvas();
noSmooth();


// -------------------------
// REAL GRAVITY
// -------------------------
const GRAVITY_Y = 6;
world.gravity.y = GRAVITY_Y;


// -------------------------
// BIKE SIZE
// -------------------------
const BIKE_SCALE = 20;


// -------------------------
// BIKE START POSITION
// -------------------------
const BIKE_X = 0;
const BIKE_Y = -10 * BIKE_SCALE;


// -------------------------
// MOVEMENT SETTINGS
// -------------------------
const BIKE_MOVE_SPEED = 8;
const WHEEL_SPIN_SPEED = 8;


// -------------------------
// FLOOR SETTINGS
// -------------------------
const FLOOR_Y = 14 * BIKE_SCALE;
const FLOOR_HEIGHT = 6 * BIKE_SCALE;


// -------------------------
// PHYSICS BODY SETTINGS
// Bottom of this hidden body
// matches the visible bottom
// pixel of the lowest wheel.
// -------------------------
const PHYSICS_BODY_WIDTH = 30 * BIKE_SCALE;
const PHYSICS_BODY_HEIGHT = 4 * BIKE_SCALE;


// -------------------------
// FALLBACK ONLY
// Used for a moment if wheel
// pixel data is not ready yet.
// -------------------------
const FALLBACK_VISIBLE_WHEEL_BOTTOM_FROM_CENTER =
    9 * BIKE_SCALE;


// -------------------------
// ALIGN MODE SETTINGS
// -------------------------
let alignMode = false;
let draggedWheel = null;
let wasMousePressed = false;

const WHEEL_PICK_RADIUS = 12 * BIKE_SCALE;


// -------------------------
// BIKE OPTIONS
// wheelsOnTop:
// false = wheels behind bike
// true = wheels in front of bike
// -------------------------
const BIKES = [
    {
        name: 'Sunset Racer',
        bodyImg: 'images/bike1small(no wheel).png',
        wheelImg: 'images/bike1wheel.png',
        wheelsOnTop: false,

        rearWheelOffsetX: -9.75 * BIKE_SCALE,
        rearWheelOffsetY: 2.75 * BIKE_SCALE,

        frontWheelOffsetX: 9.75 * BIKE_SCALE,
        frontWheelOffsetY: 2.6666666667 * BIKE_SCALE
    },
    {
        name: 'Blue Phantom',
        bodyImg: 'images/bike2small(no wheel).png',
        wheelImg: 'images/bike2wheel.png',
        wheelsOnTop: true,

        rearWheelOffsetX: -9.75 * BIKE_SCALE,
        rearWheelOffsetY: 2.75 * BIKE_SCALE,

        frontWheelOffsetX: 9.75 * BIKE_SCALE,
        frontWheelOffsetY: 2.6666666667 * BIKE_SCALE
    },
    {
        name: 'Parcel Pedal',
        bodyImg: 'images/bike3small(no wheel).png',
        wheelImg: 'images/bike3wheel.png',
        wheelsOnTop: false,

        rearWheelOffsetX: -9.11 * BIKE_SCALE,
        rearWheelOffsetY: 4.6 * BIKE_SCALE,

        frontWheelOffsetX: 8.52 * BIKE_SCALE,
        frontWheelOffsetY: 4.57 * BIKE_SCALE
    }
];

let currentBikeIndex = 0;
let currentBike = BIKES[currentBikeIndex];


// -------------------------
// CURRENT COLLISION OFFSET
// -------------------------
let physicsBodyOffsetY = 0;
let needsPhysicsOffsetRefresh = true;


// -------------------------
// HIDDEN PHYSICS BODY
// -------------------------
let bikePhysicsBody = new Sprite();
bikePhysicsBody.x = BIKE_X;
bikePhysicsBody.y = BIKE_Y;
bikePhysicsBody.w = PHYSICS_BODY_WIDTH;
bikePhysicsBody.h = PHYSICS_BODY_HEIGHT;
bikePhysicsBody.physics = DYNAMIC;
bikePhysicsBody.rotationLock = true;
bikePhysicsBody.visible = false;


// -------------------------
// FLOOR
// -------------------------
let floor = new Sprite();
floor.x = 0;
floor.y = FLOOR_Y;
floor.w = 5000;
floor.h = FLOOR_HEIGHT;
floor.color = 'gray';
floor.physics = STATIC;
floor.layer = 0;


// -------------------------
// REAR WHEEL
// -------------------------
let rearWheel = new Sprite();
rearWheel.x = BIKE_X + currentBike.rearWheelOffsetX;
rearWheel.y = BIKE_Y + currentBike.rearWheelOffsetY;
rearWheel.img = currentBike.wheelImg;
rearWheel.scale = BIKE_SCALE;
rearWheel.physics = KINEMATIC;
rearWheel.passes(allSprites);


// -------------------------
// FRONT WHEEL
// -------------------------
let frontWheel = new Sprite();
frontWheel.x = BIKE_X + currentBike.frontWheelOffsetX;
frontWheel.y = BIKE_Y + currentBike.frontWheelOffsetY;
frontWheel.img = currentBike.wheelImg;
frontWheel.scale = BIKE_SCALE;
frontWheel.physics = KINEMATIC;
frontWheel.passes(allSprites);


// -------------------------
// BIKE BODY
// -------------------------
let bike1 = new Sprite();
bike1.x = BIKE_X;
bike1.y = BIKE_Y;
bike1.img = currentBike.bodyImg;
bike1.scale = BIKE_SCALE;
bike1.physics = KINEMATIC;
bike1.layer = 2;
bike1.passes(allSprites);


// -------------------------
// FIND THE LOWEST VISIBLE
// PIXEL IN THE WHEEL IMAGE
// (Debug Enhanced)
// -------------------------
function getVisibleWheelBottomFromCenter() {
    const img = rearWheel.img;

    if (!img || !img.width || !img.height || img.width <= 0 || img.height <= 0) {
        console.log("DEBUG: Image completely missing or dimensions are 0. Using fallback.");
        return FALLBACK_VISIBLE_WHEEL_BOTTOM_FROM_CENTER;
    }

    img.loadPixels();

    if (!img.pixels || img.pixels.length < img.width * img.height * 4) {
        console.log("DEBUG: img.pixels array is empty or too small. Using fallback.");
        return FALLBACK_VISIBLE_WHEEL_BOTTOM_FROM_CENTER;
    }

    const totalPhysicalPixels = img.pixels.length / 4;
    const totalLogicalPixels = img.width * img.height;
    const densitySq = totalPhysicalPixels / totalLogicalPixels;
    const d = Math.round(Math.sqrt(densitySq));

    let maxPixelIndexWithAlpha = -1;
    let highestAlphaFound = 0;

    for (let i = 3; i < img.pixels.length; i += 4) {
        if (img.pixels[i] > highestAlphaFound) {
            highestAlphaFound = img.pixels[i];
        }
        // STRICTURE THRESHOLD: Ignore shadows and faint artifacts
        if (img.pixels[i] > 240) {
            maxPixelIndexWithAlpha = i;
        }
    }

    if (maxPixelIndexWithAlpha === -1) {
        console.log(`DEBUG: Wheel is completely transparent! Max alpha found was: ${highestAlphaFound}. Using fallback.`);
        return FALLBACK_VISIBLE_WHEEL_BOTTOM_FROM_CENTER;
    }

    const pixelIndex = (maxPixelIndexWithAlpha - 3) / 4;
    const physicalWidth = img.width * d;
    const physicalY = Math.floor(pixelIndex / physicalWidth);

    const bottomEdgeFromTop = (physicalY + 1) / d;
    const bottomPixelPositionFromImageCenter = bottomEdgeFromTop - img.height / 2;

    console.log(`DEBUG: Wheel bottom found! Density: ${d}x, Img Height: ${img.height}, Lowest Y pixel: ${bottomEdgeFromTop}`);
    console.log(`DEBUG: Returned Unscaled Center Offset: ${bottomPixelPositionFromImageCenter}`);

    return bottomPixelPositionFromImageCenter * BIKE_SCALE;
}


// -------------------------
// REFRESH COLLISION SO THE
// HIDDEN BODY'S BOTTOM MATCHES
// THE LOWEST VISIBLE WHEEL PIXEL
// (Debug Enhanced)
// -------------------------
function refreshPhysicsOffsetFromVisibleWheelBottom() {
    const visibleWheelBottomFromCenter = getVisibleWheelBottomFromCenter();

    const rearVisibleBottomOffset = currentBike.rearWheelOffsetY + visibleWheelBottomFromCenter;
    const frontVisibleBottomOffset = currentBike.frontWheelOffsetY + visibleWheelBottomFromCenter;

    const lowestVisibleWheelBottomOffset = Math.max(rearVisibleBottomOffset, frontVisibleBottomOffset);

    physicsBodyOffsetY = lowestVisibleWheelBottomOffset - PHYSICS_BODY_HEIGHT / 2;

    console.log(`DEBUG: physicsBodyOffsetY calculated as: ${physicsBodyOffsetY}`);
}


// -------------------------
// WHEEL LAYER CONTROL
// Blue Phantom = wheels on top
// Other bikes = wheels behind body
// -------------------------
function updateWheelLayers() {
    if (currentBike.wheelsOnTop) {
        rearWheel.layer = 3;
        frontWheel.layer = 3;
    }
    else {
        rearWheel.layer = 1;
        frontWheel.layer = 1;
    }
}

updateWheelLayers();


// -------------------------
// HELPER: FORMAT OFFSET VALUES
// Example: -9.75 * BIKE_SCALE
// -------------------------
function formatScaleValue(value) {
    let scaledValue = value / BIKE_SCALE;
    return Number(scaledValue.toFixed(4)).toString();
}


// -------------------------
// ALIGN MODE READOUT PANEL
// -------------------------
let alignReadout = document.createElement('div');

alignReadout.style.position = 'fixed';
alignReadout.style.top = '85px';
alignReadout.style.right = '18px';
alignReadout.style.padding = '14px';
alignReadout.style.background = 'rgba(0, 0, 0, 0.82)';
alignReadout.style.color = 'white';
alignReadout.style.border = '2px solid white';
alignReadout.style.borderRadius = '10px';
alignReadout.style.fontFamily = 'monospace';
alignReadout.style.fontSize = '14px';
alignReadout.style.lineHeight = '1.45';
alignReadout.style.zIndex = '9999';
alignReadout.style.whiteSpace = 'pre';
alignReadout.style.display = 'none';

document.body.appendChild(alignReadout);


function updateAlignReadout() {
    alignReadout.textContent =
`ALIGNING: ${currentBike.name}

Drag the wheels with your mouse.

rearWheelOffsetX: ${formatScaleValue(currentBike.rearWheelOffsetX)} * BIKE_SCALE,
rearWheelOffsetY: ${formatScaleValue(currentBike.rearWheelOffsetY)} * BIKE_SCALE,

frontWheelOffsetX: ${formatScaleValue(currentBike.frontWheelOffsetX)} * BIKE_SCALE,
frontWheelOffsetY: ${formatScaleValue(currentBike.frontWheelOffsetY)} * BIKE_SCALE`;
}


// -------------------------
// SWITCH BIKE FUNCTION
// -------------------------
function switchBike(newIndex) {
    currentBikeIndex = newIndex;
    currentBike = BIKES[currentBikeIndex];

    bike1.img = currentBike.bodyImg;
    rearWheel.img = currentBike.wheelImg;
    frontWheel.img = currentBike.wheelImg;

    needsPhysicsOffsetRefresh = true;

    updateWheelLayers();
    updateAlignReadout();
    updateBikeButtonStyles();
}


// -------------------------
// TOP UI CONTAINER
// -------------------------
let topUI = document.createElement('div');

topUI.style.position = 'fixed';
topUI.style.top = '14px';
topUI.style.left = '50%';
topUI.style.transform = 'translateX(-50%)';
topUI.style.display = 'flex';
topUI.style.alignItems = 'center';
topUI.style.gap = '10px';
topUI.style.zIndex = '9999';
topUI.style.fontFamily = 'Arial, sans-serif';

document.body.appendChild(topUI);


// -------------------------
// BIKE TOGGLE BUTTONS
// -------------------------
const bikeButtons = [];

BIKES.forEach((bike, index) => {
    let button = document.createElement('button');

    button.textContent = bike.name;
    button.style.padding = '10px 16px';
    button.style.border = '2px solid black';
    button.style.borderRadius = '8px';
    button.style.fontSize = '16px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.color = 'black';

    button.onclick = function () {
        switchBike(index);
    };

    bikeButtons.push(button);
    topUI.appendChild(button);
});


function updateBikeButtonStyles() {
    bikeButtons.forEach((button, index) => {
        button.style.background =
            index === currentBikeIndex ? 'gold' : 'white';
    });
}

updateBikeButtonStyles();


// -------------------------
// ALIGN MODE BUTTON
// -------------------------
let alignButton = document.createElement('button');

alignButton.textContent = 'Align Mode: OFF';
alignButton.style.padding = '10px 16px';
alignButton.style.border = '2px solid black';
alignButton.style.borderRadius = '8px';
alignButton.style.fontSize = '16px';
alignButton.style.fontWeight = 'bold';
alignButton.style.cursor = 'pointer';
alignButton.style.background = 'white';
alignButton.style.color = 'black';

alignButton.onclick = function () {
    alignMode = !alignMode;

    if (alignMode) {
        alignButton.textContent = 'Align Mode: ON';
        alignButton.style.background = '#7CFC00';

        alignReadout.style.display = 'block';
        updateAlignReadout();

        world.gravity.y = 0;
        bikePhysicsBody.vel.x = 0;
        bikePhysicsBody.vel.y = 0;
    }
    else {
        alignButton.textContent = 'Align Mode: OFF';
        alignButton.style.background = 'white';

        alignReadout.style.display = 'none';
        draggedWheel = null;

        needsPhysicsOffsetRefresh = true;
        world.gravity.y = GRAVITY_Y;
    }
};

topUI.appendChild(alignButton);


// -------------------------
// DISTANCE HELPER
// -------------------------
function getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}


// -------------------------
// START DRAGGING A WHEEL
// -------------------------
function tryStartWheelDrag() {
    const rearDistance = getDistance(
        mouse.x,
        mouse.y,
        rearWheel.x,
        rearWheel.y
    );

    const frontDistance = getDistance(
        mouse.x,
        mouse.y,
        frontWheel.x,
        frontWheel.y
    );

    const rearIsClose = rearDistance <= WHEEL_PICK_RADIUS;
    const frontIsClose = frontDistance <= WHEEL_PICK_RADIUS;

    if (rearIsClose && frontIsClose) {
        draggedWheel =
            rearDistance < frontDistance ? 'rear' : 'front';
    }
    else if (rearIsClose) {
        draggedWheel = 'rear';
    }
    else if (frontIsClose) {
        draggedWheel = 'front';
    }
}


// -------------------------
// UPDATE WHEEL DRAGGING
// -------------------------
function updateWheelDragging() {
    const mouseIsPressed = mouse.pressing();

    if (alignMode && mouseIsPressed && !wasMousePressed) {
        tryStartWheelDrag();
    }

    if (alignMode && draggedWheel && mouseIsPressed) {
        if (draggedWheel === 'rear') {
            rearWheel.x = mouse.x;
            rearWheel.y = mouse.y;

            currentBike.rearWheelOffsetX = rearWheel.x - bike1.x;
            currentBike.rearWheelOffsetY = rearWheel.y - bike1.y;
        }

        if (draggedWheel === 'front') {
            frontWheel.x = mouse.x;
            frontWheel.y = mouse.y;

            currentBike.frontWheelOffsetX = frontWheel.x - bike1.x;
            currentBike.frontWheelOffsetY = frontWheel.y - bike1.y;
        }

        updateAlignReadout();
    }

    if (!mouseIsPressed) {
        draggedWheel = null;
    }

    wasMousePressed = mouseIsPressed;
}


// -------------------------
// GAME LOOP
// -------------------------
q5.update = function () {
    background('skyblue');


    // -------------------------
    // DEBUG STATE DUMP (Press P)
    // -------------------------
    if (kb.presses('p')) {
        console.log(`\n--- PHYSICS STATE DUMP ---`);
        console.log(`Floor Y: ${floor.y}, Height: ${floor.h}`);
        console.log(`Floor Top Edge (Collision): ${floor.y - floor.h / 2}`);
        console.log(`--`);
        console.log(`Physics Body Y: ${bikePhysicsBody.y}, Height: ${bikePhysicsBody.h}`);
        console.log(`Physics Body Bottom Edge (Collision): ${bikePhysicsBody.y + bikePhysicsBody.h / 2}`);
        console.log(`--`);
        console.log(`Visual Bike Y: ${bike1.y}`);
        console.log(`Calculated Visual Offset: ${physicsBodyOffsetY}`);
        console.log(`--------------------------\n`);
    }


    // -------------------------
    // REFRESH COLLISION USING
    // THE LOWEST VISIBLE WHEEL PIXEL
    // -------------------------
    if (needsPhysicsOffsetRefresh) {
        refreshPhysicsOffsetFromVisibleWheelBottom();

        if (
            rearWheel.img &&
            rearWheel.img.width > 0 &&
            rearWheel.img.height > 0
        ) {
            needsPhysicsOffsetRefresh = false;
        }
    }


    // -------------------------
    // NORMAL DRIVING CONTROLS
    // Disabled in Align Mode
    // -------------------------
    if (!alignMode) {
        if (kb.pressing('w')) {
            bikePhysicsBody.vel.x = BIKE_MOVE_SPEED;

            rearWheel.rotation += WHEEL_SPIN_SPEED;
            frontWheel.rotation += WHEEL_SPIN_SPEED;
        }
        else if (kb.pressing('s')) {
            bikePhysicsBody.vel.x = -BIKE_MOVE_SPEED;

            rearWheel.rotation -= WHEEL_SPIN_SPEED;
            frontWheel.rotation -= WHEEL_SPIN_SPEED;
        }
        else {
            bikePhysicsBody.vel.x = 0;
        }
    }
    else {
        bikePhysicsBody.vel.x = 0;
        bikePhysicsBody.vel.y = 0;
    }


    // -------------------------
    // MAKE BIKE ART FOLLOW
    // THE PHYSICS BODY
    // -------------------------
    bike1.x = bikePhysicsBody.x;
    bike1.y = bikePhysicsBody.y - physicsBodyOffsetY;


    // -------------------------
    // KEEP WHEELS ATTACHED
    // TO STORED OFFSETS
    // -------------------------
    rearWheel.x = bike1.x + currentBike.rearWheelOffsetX;
    rearWheel.y = bike1.y + currentBike.rearWheelOffsetY;

    frontWheel.x = bike1.x + currentBike.frontWheelOffsetX;
    frontWheel.y = bike1.y + currentBike.frontWheelOffsetY;


    // -------------------------
    // ALIGN MODE DRAGGING
    // -------------------------
    updateWheelDragging();
};