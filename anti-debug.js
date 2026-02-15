(function() {
    const devtools = {
        isOpen: false,
        orientation: null
    };

    const threshold = 160;
    const emitEvent = (isOpen, orientation) => {
        window.dispatchEvent(new CustomEvent('devtoolschange', {
            detail: { isOpen, orientation }
        }));
    };

    setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const orientation = widthThreshold ? 'vertical' : 'horizontal';

        if (!(heightThreshold && widthThreshold) &&
            ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
            if (!devtools.isOpen || devtools.orientation !== orientation) {
                emitEvent(true, orientation);
            }
            devtools.isOpen = true;
            devtools.orientation = orientation;
        } else {
            if (devtools.isOpen) {
                emitEvent(false, null);
            }
            devtools.isOpen = false;
            devtools.orientation = null;
        }
    }, 500);

    const detectDevTools = () => {
        const start = performance.now();
        debugger;
        const end = performance.now();
        if (end - start > 100) {
            console.clear();
        }
    };

    setInterval(detectDevTools, 1000);

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });

    const disableConsole = () => {
        const noop = () => {};
        const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'group', 'groupEnd', 'clear'];
        methods.forEach(method => {
            console[method] = noop;
        });
    };

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setTimeout(disableConsole, 1000);
    }
})();
