
import React, { useRef, useEffect, useState } from 'react';
import { Trash2Icon } from '../constants';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onClose: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number, y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(ratio, ratio);
        const isDark = document.documentElement.classList.contains('dark');
        ctx.strokeStyle = isDark ? 'var(--color-text-light)' : 'var(--color-text-primary)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    useEffect(() => {
        setupCanvas();
        window.addEventListener('resize', setupCanvas);
        return () => window.removeEventListener('resize', setupCanvas);
    }, []);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { offsetX: 0, offsetY: 0 };
        const rect = canvas.getBoundingClientRect();

        if (e.nativeEvent instanceof MouseEvent) {
            return { offsetX: e.nativeEvent.clientX - rect.left, offsetY: e.nativeEvent.clientY - rect.top };
        }
        if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length > 0) {
            return { offsetX: e.nativeEvent.touches[0].clientX - rect.left, offsetY: e.nativeEvent.touches[0].clientY - rect.top };
        }
        return { offsetX: 0, offsetY: 0 };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { offsetX, offsetY } = getCoords(e);
        setIsDrawing(true);
        if (!isSigned) setIsSigned(true);
        
        lastPointRef.current = { x: offsetX, y: offsetY };
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !lastPointRef.current) return;
        
        const { offsetX, offsetY } = getCoords(e);
        const midPointX = (lastPointRef.current.x + offsetX) / 2;
        const midPointY = (lastPointRef.current.y + offsetY) / 2;

        ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPointX, midPointY);
        ctx.stroke();

        lastPointRef.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !lastPointRef.current) return;

        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.stroke();
        ctx.closePath();

        setIsDrawing(false);
        lastPointRef.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
        setIsSigned(false);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (canvas && isSigned) {
            onSave(canvas.toDataURL('image/png'));
        } else {
            alert("Mohon bubuhkan tanda tangan terlebih dahulu.");
        }
    };
    
    return (
        <div className="flex flex-col items-center w-full">
            <p className="text-sm text-brand-text-secondary mb-3 text-center">Gunakan mouse atau jari Anda untuk menandatangani di area di bawah ini.</p>
            <div className="relative w-full aspect-[2/1] rounded-lg border-2 border-dashed border-brand-border overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full bg-brand-bg cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!isSigned && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-brand-text-secondary/60">
                        <p className="font-semibold text-lg">Tanda Tangan di Sini</p>
                        <div className="w-3/4 h-px bg-brand-border mt-10"></div>
                    </div>
                )}
            </div>
            <div className="flex w-full justify-between items-center mt-4">
                <button onClick={clearCanvas} disabled={!isSigned} className="button-secondary text-sm inline-flex items-center gap-2">
                    <Trash2Icon className="w-4 h-4" /> Ulangi
                </button>
                 <div className="space-x-2">
                    <button onClick={onClose} className="button-secondary text-sm">Batal</button>
                    <button onClick={saveSignature} disabled={!isSigned} className="button-primary text-sm">Simpan Tanda Tangan</button>
                </div>
            </div>
        </div>
    );
};

export default SignaturePad;
