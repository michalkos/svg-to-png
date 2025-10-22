import React, { useState, useCallback, useRef } from 'react';
import { DownloadIcon, SpinnerIcon, UploadIcon, LinkIcon } from './components/icons';

const DEFAULT_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(14, 165, 233);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(16, 185, 129);stop-opacity:1" />
    </linearGradient>
  </defs>
  <path fill="url(#grad1)" d="M50 0L61.22 38.78H100L69.39 61.22L80.61 100L50 77.56L19.39 100L30.61 61.22L0 38.78H38.78L50 0Z" />
</svg>`;

type InputMode = 'code' | 'upload' | 'url';

const App: React.FC = () => {
    const [svgString, setSvgString] = useState<string>(DEFAULT_SVG);
    const [width, setWidth] = useState<number>(512);
    const [height, setHeight] = useState<number>(512);
    const [isTransparent, setIsTransparent] = useState<boolean>(true);
    const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
    const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [inputMode, setInputMode] = useState<InputMode>('code');
    const [svgUrl, setSvgUrl] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const handleGeneratePng = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setUrlError(null);
        setPngDataUrl(null);

        if (!svgString.trim()) {
            setError("SVG input cannot be empty.");
            setIsLoading(false);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setError("Could not get canvas context.");
            setIsLoading(false);
            return;
        }

        if (!isTransparent) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL('image/png');
            setPngDataUrl(pngUrl);
            setIsLoading(false);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            setError("Invalid SVG. Please check your SVG code.");
            setIsLoading(false);
        };

        img.src = url;
    }, [svgString, width, height, isTransparent, backgroundColor]);
    
    const handleDownload = () => {
        if (!pngDataUrl) return;
        const link = document.createElement('a');
        link.href = pngDataUrl;
        link.download = 'converted.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'image/svg+xml') {
                setError("Invalid file type. Please upload an SVG file.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    setSvgString(text);
                    setError(null);
                    setFileName(file.name);
                }
            };
            reader.onerror = () => {
                setError("Failed to read the file.");
            };
            reader.readAsText(file);
        }
    };

    const handleFetchSvgFromUrl = async () => {
        if (!svgUrl) return;

        setIsFetchingUrl(true);
        setUrlError(null);
        setError(null);

        try {
            // NOTE: Using a public CORS proxy for client-side fetching. 
            // This is for demonstration; a production app should use a dedicated server-side proxy.
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(svgUrl)}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok (status: ${response.status})`);
            }
            const data = await response.json();
            const svgContent = data.contents;
            
            if (!svgContent || typeof svgContent !== 'string' || !svgContent.trim().toLowerCase().includes('<svg')) {
                throw new Error("The fetched content does not appear to be a valid SVG.");
            }

            setSvgString(svgContent);
            setFileName(svgUrl.split('/').pop() || svgUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setUrlError(`Failed to fetch SVG. Please check the URL and its CORS policy. Error: ${errorMessage}`);
        } finally {
            setIsFetchingUrl(false);
        }
    };

    const handleSvgTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSvgString(e.target.value);
        setFileName(''); 
    };

    const handleSetInputMode = (mode: InputMode) => {
        setInputMode(mode);
        setError(null);
        setUrlError(null);
    };


    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            <header className="w-full max-w-7xl mb-8 text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
                    SVG to PNG Converter
                </h1>
                <p className="mt-2 text-gray-400">Instantly convert your SVG code to a high-quality PNG image.</p>
            </header>

            <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls Panel */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-sky-300">SVG Input</h3>
                        <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => handleSetInputMode('code')} className={`px-4 py-2 font-medium text-sm transition-colors duration-200 ${inputMode === 'code' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-white'}`}>
                                SVG Code
                            </button>
                            <button onClick={() => handleSetInputMode('upload')} className={`px-4 py-2 font-medium text-sm transition-colors duration-200 ${inputMode === 'upload' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-white'}`}>
                                Upload File
                            </button>
                            <button onClick={() => handleSetInputMode('url')} className={`px-4 py-2 font-medium text-sm transition-colors duration-200 ${inputMode === 'url' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-white'}`}>
                                From URL
                            </button>
                        </div>
                        
                        {inputMode === 'code' && (
                            <textarea
                                id="svg-input"
                                value={svgString}
                                onChange={handleSvgTextChange}
                                placeholder="Paste your SVG code here"
                                className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 text-sm font-mono resize-y"
                            />
                        )}
                        {inputMode === 'upload' && (
                            <div className="h-48 flex flex-col items-center justify-center bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/svg+xml"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    <UploadIcon />
                                    Choose SVG File
                                </button>
                                {fileName && <p className="text-sm text-gray-400 mt-3 text-center truncate w-full" title={fileName}>Selected: {fileName}</p>}
                            </div>
                        )}
                        {inputMode === 'url' && (
                             <div className="h-48 flex flex-col justify-center">
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={svgUrl}
                                        onChange={(e) => setSvgUrl(e.target.value)}
                                        placeholder="https://example.com/image.svg"
                                        className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-l-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 text-sm font-mono"
                                    />
                                    <button
                                        onClick={handleFetchSvgFromUrl}
                                        disabled={isFetchingUrl || !svgUrl}
                                        className="flex items-center justify-center px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-r-lg shadow-lg transition-all duration-200 disabled:bg-sky-800 disabled:cursor-wait"
                                    >
                                        {isFetchingUrl ? <SpinnerIcon /> : <LinkIcon />}
                                    </button>
                                </div>
                                {isFetchingUrl && <p className="text-sm text-sky-400 mt-2">Fetching SVG...</p>}
                                {urlError && <p className="text-red-400 text-sm mt-2">{urlError}</p>}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-sky-300">Output Settings</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="width" className="block text-sm font-medium mb-1 text-gray-400">Width (px)</label>
                                <input
                                    type="number"
                                    id="width"
                                    value={width}
                                    onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="height" className="block text-sm font-medium mb-1 text-gray-400">Height (px)</label>
                                <input
                                    type="number"
                                    id="height"
                                    value={height}
                                    onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-sky-300">Background</h3>
                        <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                            <label htmlFor="transparent-toggle" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" id="transparent-toggle" className="sr-only" checked={isTransparent} onChange={() => setIsTransparent(!isTransparent)} />
                                    <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                                </div>
                                <div className="ml-3 text-gray-200">Transparent</div>
                            </label>
                            
                            <div className={`flex items-center transition-opacity duration-300 ${isTransparent ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}`}>
                                <label htmlFor="bg-color" className="mr-2 text-gray-400">Color:</label>
                                <input
                                    type="color"
                                    id="bg-color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    disabled={isTransparent}
                                    className="w-10 h-10 p-0 border-none rounded-md bg-transparent disabled:cursor-not-allowed cursor-pointer"
                                />
                            </div>
                        </div>
                        {/* Fix: Replaced inline style block with dangerouslySetInnerHTML to prevent TSX parsing errors for CSS properties. */}
                        <style dangerouslySetInnerHTML={{__html: `
                            #transparent-toggle:checked ~ .dot { transform: translateX(100%); background-color: #0ea5e9; }
                            input[type="color"] { -webkit-appearance: none; appearance: none; }
                            input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
                            input[type="color"]::-webkit-color-swatch { border: 2px solid #4B5563; border-radius: 0.375rem; }
                        `}}/>
                    </div>

                    <button
                        onClick={handleGeneratePng}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:bg-sky-800 disabled:cursor-wait"
                    >
                        {isLoading ? (
                            <>
                                <SpinnerIcon />
                                <span className="ml-2">Generating...</span>
                            </>
                        ) : (
                            'Generate PNG'
                        )}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                </div>

                {/* Preview Panel */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700 flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="text-xl font-bold mb-4 text-emerald-300 self-start">Preview</h2>
                    <div className="w-full h-full flex-grow flex items-center justify-center rounded-lg bg-[url('data:image/svg+xml,%3csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2032%2032%22%20width=%2232%22%20height=%2232%22%20fill=%22none%22%3e%3cpath%20d=%22M0%200h16v16H0z%22%20fill=%22%23374151%22/%3e%3cpath%20d=%22M16%2016h16v16H16z%22%20fill=%22%23374151%22/%3e%3c/svg%3e')] bg-repeat">
                        {pngDataUrl ? (
                            <img src={pngDataUrl} alt="Generated PNG" className="object-contain shadow-lg" style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%', maxHeight: '450px' }}/>
                        ) : (
                            <div className="text-gray-500 text-center p-4">
                                {isLoading ? 'Your PNG is being generated...' : 'Your generated PNG will appear here.'}
                            </div>
                        )}
                    </div>
                    {pngDataUrl && (
                        <button
                            onClick={handleDownload}
                            className="mt-6 w-full flex items-center justify-center py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                        >
                            <DownloadIcon />
                            Download PNG
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
