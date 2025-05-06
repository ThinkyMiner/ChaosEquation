document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const canvas = document.getElementById('chaosCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const clearBtn = document.getElementById('clear');
    const applyBtn = document.getElementById('apply');
    const randomizeBtn = document.getElementById('randomize');
    const loadCodeBtn = document.getElementById('loadCode');
    const centerBtn = document.getElementById('center');
    const speedSlider = document.getElementById('speed');
    const equation1Input = document.getElementById('equation1');
    const equation2Input = document.getElementById('equation2');
    const equationCodeInput = document.getElementById('equationCodeInput');
    const initialTInput = document.getElementById('initialT');
    const tRateInput = document.getElementById('tRate');
    
    // Constants from main.cpp
    const NUM_PARAMS = 18;  // 9 terms for x', 9 terms for y'
    const ITERATIONS = 800; // Same as iters in main.cpp
    const STEPS_PER_FRAME = 50; // Reduced from 500 for browser performance
    const T_START = -3.0;
    const T_END = 3.0;
    const DELTA_PER_STEP = 1e-5;
    const DELTA_MINIMUM = 1e-7;
    
    // Set canvas dimensions with high resolution
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${canvas.offsetWidth}px`;
        canvas.style.height = `${canvas.offsetHeight}px`;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Plot settings (similar to main.cpp globals)
    let plot_scale = 0.25;
    let plot_x = 0.0;
    let plot_y = 0.0;
    
    // Variables for the chaos equation
    let t = T_START;
    let animationId = null;
    let history = new Array(ITERATIONS);
    let speed = 50;
    let speedMult = 1.0;
    let paused = false;
    let shuffleEqu = true;
    let iterationLimit = false;
    let trailType = 0;
    let dotType = 0;
    let rollingDelta = DELTA_PER_STEP;
    
    // Initialize equation parameters (18 parameters as in main.cpp)
    let params = new Array(NUM_PARAMS).fill(0);
    
    // Get random color for points (directly from GetRandColor in main.cpp)
    function getRandColor(i) {
        i += 1;
        const r = Math.min(255, 50 + (i * 11909) % 256);
        const g = Math.min(255, 50 + (i * 52973) % 256);
        const b = Math.min(255, 50 + (i * 44111) % 256);
        return `rgba(${r}, ${g}, ${b}, 0.8)`;  // Added alpha for better visibility
    }
    
    // Initialize colors array
    const colors = Array(ITERATIONS).fill().map((_, i) => getRandColor(i));
    
    // Convert coordinate to screen position (from ToScreen in main.cpp)
    function toScreen(x, y) {
        const s = plot_scale * canvas.offsetHeight / 2;
        const nx = canvas.offsetWidth * 0.5 + (x - plot_x) * s;
        const ny = canvas.offsetHeight * 0.5 + (y - plot_y) * s;
        return { x: nx, y: ny };
    }
    
    // Randomize parameters (from RandParams in main.cpp)
    function randParams() {
        for (let i = 0; i < NUM_PARAMS; i++) {
            const r = Math.floor(Math.random() * 3);
            if (r === 0) {
                params[i] = 1.0;
            } else if (r === 1) {
                params[i] = -1.0;
            } else {
                params[i] = 0.0;
            }
        }
        
        // Update displays
        updateEquationDisplay();
    }
    
    // Make equation string (from MakeEquationStr in main.cpp)
    function makeEquationStr(startIdx) {
        const terms = [
            { param: startIdx + 0, text: "x²" },
            { param: startIdx + 1, text: "y²" },
            { param: startIdx + 2, text: "t²" },
            { param: startIdx + 3, text: "xy" },
            { param: startIdx + 4, text: "xt" },
            { param: startIdx + 5, text: "yt" },
            { param: startIdx + 6, text: "x" },
            { param: startIdx + 7, text: "y" },
            { param: startIdx + 8, text: "t" }
        ];
        
        let result = "";
        let isFirst = true;
        
        for (const term of terms) {
            if (params[term.param] !== 0) {
                if (isFirst) {
                    if (params[term.param] === -1.0) result += "-";
                    else if (params[term.param] !== 1.0) result += params[term.param];
                } else {
                    if (params[term.param] === -1.0) result += " - ";
                    else result += " + ";
                    if (params[term.param] !== 1.0 && params[term.param] !== -1.0) {
                        result += Math.abs(params[term.param]);
                    }
                }
                result += term.text;
                isFirst = false;
            }
        }
        
        return result || "0";
    }
    
    // Convert parameters to a code (from ParamsToString in main.cpp)
    function paramsToCode() {
        const base27 = "_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let code = "";
        
        for (let i = 0; i < NUM_PARAMS; i += 3) {
            let a = 0;
            for (let j = 0; j < 3; j++) {
                a = a * 3 + Math.floor(params[i + j]) + 1;
            }
            code += base27[a];
        }
        
        return code;
    }
    
    // Convert code to parameters (from StringToParams in main.cpp)
    function codeToParams(code) {
        for (let i = 0; i < Math.min(code.length, NUM_PARAMS/3); i++) {
            let a = 0;
            const c = code[i];
            if (c >= 'A' && c <= 'Z') {
                a = c.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
            } else if (c >= 'a' && c <= 'z') {
                a = c.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
            }
            
            params[i*3 + 2] = (a % 3) - 1.0;
            a = Math.floor(a / 3);
            params[i*3 + 1] = (a % 3) - 1.0;
            a = Math.floor(a / 3);
            params[i*3 + 0] = (a % 3) - 1.0;
        }
        
        updateEquationDisplay();
    }
    
    // Update equation display
    function updateEquationDisplay() {
        const xEquation = makeEquationStr(0);
        const yEquation = makeEquationStr(NUM_PARAMS / 2);
        
        // Update input fields
        equation1Input.value = xEquation;
        equation2Input.value = yEquation;
        
        // Update display elements
        document.getElementById('xEquationDisplay').textContent = xEquation;
        document.getElementById('yEquationDisplay').textContent = yEquation;
        
        // Update code
        const code = paramsToCode();
        document.getElementById('equationCode').textContent = code;
    }
    
    // Reset plot (from ResetPlot in main.cpp)
    function resetPlot() {
        plot_scale = 0.25;
        plot_x = 0.0;
        plot_y = 0.0;
    }
    
    // Center the plot (from CenterPlot in main.cpp)
    function centerPlot() {
        let min_x = Infinity;
        let max_x = -Infinity;
        let min_y = Infinity;
        let max_y = -Infinity;
        
        for (const point of history) {
            if (point) {
                min_x = Math.min(min_x, point.x);
                max_x = Math.max(max_x, point.x);
                min_y = Math.min(min_y, point.y);
                max_y = Math.max(max_y, point.y);
            }
        }
        
        // Apply limits as in main.cpp
        max_x = Math.min(max_x, 4.0);
        max_y = Math.min(max_y, 4.0);
        min_x = Math.max(min_x, -4.0);
        min_y = Math.max(min_y, -4.0);
        
        plot_x = (max_x + min_x) * 0.5;
        plot_y = (max_y + min_y) * 0.5;
        plot_scale = 1.0 / Math.max(Math.max(max_x - min_x, max_y - min_y) * 0.6, 0.1);
    }
    
    // Generate new equation setup (similar to GenerateNew in main.cpp)
    function generateNew() {
        t = parseFloat(initialTInput.value) || T_START;
        history = new Array(ITERATIONS);
        rollingDelta = DELTA_PER_STEP;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        
        // Update display
        updateEquationDisplay();
        updateTDisplay();
    }
    
    // Update t display
    function updateTDisplay() {
        document.getElementById('tValue').textContent = t.toFixed(5);
    }
    
    // Calculate the next points based on the equations (main calculation loop from main.cpp)
    function runSimulation() {
        if (paused) {
            requestAnimationFrame(runSimulation);
            return;
        }
        
        // Check if we've reached the end
        if (t > T_END) {
            if (shuffleEqu) {
                resetPlot();
                randParams();
            }
            generateNew();
        }
        
        // Apply fade effect based on trail type (from main.cpp fade logic)
        const fadeAmounts = [0.05, 0.01, 0, 1]; // Similar to fade_speeds in main.cpp
        const fadeAmount = fadeAmounts[trailType];
        
        if (fadeAmount > 0 && fadeAmount < 1) {
            ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
            ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        } else if (fadeAmount === 1) {
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        }
        
        // Calculate steps per frame based on speed
        const steps = STEPS_PER_FRAME;
        const delta = DELTA_PER_STEP * speedMult * (speed / 50);
        rollingDelta = rollingDelta * 0.99 + delta * 0.01;
        
        // Run simulation steps
        for (let step = 0; step < steps; step++) {
            let isOffScreen = true;
            let x = t;  // Initial x = t as in main.cpp
            let y = t;  // Initial y = t as in main.cpp
            
            // Apply iterations (from main chaos calculation loop)
            for (let iter = 0; iter < ITERATIONS; iter++) {
                // Calculate terms exactly as in main.cpp
                const xx = x * x;
                const yy = y * y;
                const tt = t * t;
                const xy = x * y;
                const xt = x * t;
                const yt = y * t;
                
                // Calculate next x and y values
                const nx = xx*params[0] + yy*params[1] + tt*params[2] + xy*params[3] + 
                           xt*params[4] + yt*params[5] + x*params[6] + y*params[7] + t*params[8];
                const ny = xx*params[9] + yy*params[10] + tt*params[11] + xy*params[12] + 
                           xt*params[13] + yt*params[14] + x*params[15] + y*params[16] + t*params[17];
                
                // Update x and y
                x = nx;
                y = ny;
                
                // Store history
                history[iter] = { x, y };
                
                // Convert to screen coordinates
                const screenPt = toScreen(x, y);
                
                // Skip drawing if using iteration limit and below threshold
                if (iterationLimit && iter < 100) continue;
                
                // Draw the point
                const dotSizes = [1.0, 3.0, 10.0]; // Same as in main.cpp
                const currentDotSize = dotSizes[dotType];
                
                ctx.beginPath();
                ctx.arc(screenPt.x, screenPt.y, currentDotSize, 0, Math.PI * 2);
                ctx.fillStyle = colors[iter];
                ctx.fill();
                
                // Check if point is on screen for dynamic delta adjustment (similar to main.cpp)
                if (screenPt.x > 0 && screenPt.y > 0 && 
                    screenPt.x < canvas.offsetWidth && screenPt.y < canvas.offsetHeight) {
                    // Adjust rolling delta based on point movement (simplified from main.cpp)
                    isOffScreen = false;
                }
            }
            
            // Update t (from main.cpp logic)
            if (isOffScreen) {
                t += 0.01 * speedMult;
            } else {
                t += rollingDelta;
            }
            
            // Update t display
            updateTDisplay();
        }
        
        animationId = requestAnimationFrame(runSimulation);
    }
    
    // Parse equation text to parameters (converts equation input to parameters)
    function parseEquationFromInput() {
        // Reset all parameters to zero
        params.fill(0);
        
        try {
            // Parse X equation (first half of parameters)
            parseEquationToParams(equation1Input.value, 0);
            
            // Parse Y equation (second half of parameters)
            parseEquationToParams(equation2Input.value, NUM_PARAMS / 2);
            
            // Update displays
            updateEquationDisplay();
            return true;
        } catch (error) {
            console.error("Error parsing equation:", error);
            alert("Invalid equation format. Please use terms like x², y², t², xy, xt, yt, x, y, t with + and - operators.");
            return false;
        }
    }
    
    // Parse an equation string to parameters array
    function parseEquationToParams(equation, startIdx) {
        // Define terms to look for
        const terms = [
            { regex: /x\s*[\^²]?\s*2|x\s*²|x\s*\*\s*x/, index: 0 }, // x²
            { regex: /y\s*[\^²]?\s*2|y\s*²|y\s*\*\s*y/, index: 1 }, // y²
            { regex: /t\s*[\^²]?\s*2|t\s*²|t\s*\*\s*t/, index: 2 }, // t²
            { regex: /x\s*\*?\s*y|y\s*\*?\s*x/, index: 3 },         // xy
            { regex: /x\s*\*?\s*t|t\s*\*?\s*x/, index: 4 },         // xt
            { regex: /y\s*\*?\s*t|t\s*\*?\s*y/, index: 5 },         // yt
            { regex: /\b[^a-zA-Z]?x\b/, index: 6 },                 // x
            { regex: /\b[^a-zA-Z]?y\b/, index: 7 },                 // y
            { regex: /\b[^a-zA-Z]?t\b/, index: 8 }                  // t
        ];
        
        // Break into terms by + and -
        const cleanEq = equation.replace(/\s+/g, '');
        let currentSign = 1;
        let currentTerm = '';
        
        // Add a + at the beginning if needed for parsing
        const normalizedEq = (cleanEq[0] !== '+' && cleanEq[0] !== '-') ? '+' + cleanEq : cleanEq;
        
        for (let i = 0; i < normalizedEq.length; i++) {
            const char = normalizedEq[i];
            
            if ((char === '+' || char === '-') && i > 0) {
                // Process the previous term
                processTerm(currentTerm, currentSign);
                currentSign = (char === '+') ? 1 : -1;
                currentTerm = '';
            } else {
                currentTerm += char;
            }
        }
        
        // Process the last term
        if (currentTerm) {
            processTerm(currentTerm, currentSign);
        }
        
        // Helper function to process each term
        function processTerm(term, sign) {
            // Skip empty terms
            if (!term) return;
            
            // Check which term matches
            for (const termDef of terms) {
                if (termDef.regex.test(term)) {
                    // Extract coefficient if any
                    let coef = 1;
                    const coefMatch = term.match(/^[+-]?(\d+(\.\d+)?)?/);
                    if (coefMatch && coefMatch[1]) {
                        coef = parseFloat(coefMatch[1]);
                    }
                    
                    // Set the parameter with the right sign and coefficient
                    params[startIdx + termDef.index] = sign * coef;
                    return;
                }
            }
        }
    }
    
    // Initialize with random parameters
    randParams();
    resetPlot();
    generateNew();
    
    // Event listeners
    startBtn.addEventListener('click', () => {
        if (!animationId) {
            paused = false;
            runSimulation();
        }
    });
    
    stopBtn.addEventListener('click', () => {
        paused = true;
    });
    
    clearBtn.addEventListener('click', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        resetPlot();
        generateNew();
    });
    
    applyBtn.addEventListener('click', () => {
        if (parseEquationFromInput()) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            resetPlot();
            generateNew();
        }
    });
    
    randomizeBtn.addEventListener('click', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        resetPlot();
        randParams();
        generateNew();
    });
    
    loadCodeBtn.addEventListener('click', () => {
        const code = equationCodeInput.value.trim();
        if (code) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            resetPlot();
            codeToParams(code);
            generateNew();
        } else {
            alert("Please enter an equation code.");
        }
    });
    
    centerBtn.addEventListener('click', () => {
        centerPlot();
    });
    
    speedSlider.addEventListener('input', () => {
        speed = parseInt(speedSlider.value);
        updateSpeedInfo();
    });
    
    // Function to update speed information display
    function updateSpeedInfo() {
        const speedInfo = document.querySelector('#speed + .control-info');
        if (speedInfo) {
            speedInfo.textContent = `${speed} (affects simulation speed)`;
        }
    }
    
    // Add keyboard controls (same as in main.cpp)
    document.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'a':
                shuffleEqu = true;
                break;
            case 'r':
                shuffleEqu = false;
                break;
            case 'c':
                centerPlot();
                break;
            case 'd':
                dotType = (dotType + 1) % 3;
                break;
            case 'i':
                iterationLimit = !iterationLimit;
                break;
            case 't':
                trailType = (trailType + 1) % 4;
                break;
            case 'p':
                paused = !paused;
                break;
            case 'n':
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                resetPlot();
                randParams();
                generateNew();
                runSimulation();
                break;
            case ' ':
                speedMult = -speedMult;
                break;
        }
    });
    
    // Add canvas zoom and pan controls
    let isDragging = false;
    let lastX, lastY;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            
            // Move plot (reverse direction to make it feel like dragging the plot)
            plot_x -= dx / (plot_scale * canvas.offsetHeight / 2);
            plot_y -= dy / (plot_scale * canvas.offsetHeight / 2);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        // Calculate zoom factor based on wheel direction
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Zoom in/out
        plot_scale *= zoomFactor;
    });
    
    // Initialize speed info display
    updateSpeedInfo();
    
    // Add event listeners for featured pattern buttons
    document.querySelectorAll('.code-btn').forEach(button => {
        button.addEventListener('click', () => {
            const code = button.getAttribute('data-code');
            if (code) {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                equationCodeInput.value = code; // Display the code in the input field
                resetPlot();
                codeToParams(code);
                generateNew();
                
                // Auto-start the animation
                paused = false;
                runSimulation();
                
                // Highlight the selected button
                document.querySelectorAll('.code-btn').forEach(btn => {
                    btn.style.backgroundColor = '#2C3E50';
                });
                button.style.backgroundColor = '#16a085';
            }
        });
    });
});