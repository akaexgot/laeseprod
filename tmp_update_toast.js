const fs = require('fs');
const path = require('path');

const showToastNew = `
        function showToast(message: string, type: 'error' | 'success' = 'error') {
            const container = document.getElementById('toast-container')!;
            const toast = document.createElement('div');
            toast.className = \\\`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto \\\${type === 'success' ? 'bg-zinc-900 border-zinc-700/50 text-zinc-100' : 'bg-red-500/10 border-red-500/20 text-red-500'}\\\`;
            toast.style.cssText = 'backdrop-filter:blur(12px); animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);';
            
            if (type === 'success') {
                toast.innerHTML = \\\`<div class="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-3.5 h-3.5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div><span class="text-emerald-400 font-semibold tracking-wide">\\\${message}</span>\\\`;
            } else {
                toast.innerHTML = \\\`<div class="w-5 h-5 flex items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-3.5 h-3.5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div><span class="text-rose-400 font-semibold tracking-wide">\\\${message}</span>\\\`;
            }
            
            container.appendChild(toast);
            setTimeout(() => { toast.style.animation = 'toast-out 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
        }
`;

const dir = 'c:/Users/joaqu/Desktop/DAM/2DAM/Proyectos/VIDEOMARKETING SEVILLA/src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro') && f !== 'ajustes.astro');

for (const f of files) {
    let content = fs.readFileSync(path.join(dir, f), 'utf-8');
    
    // Replace container
    content = content.replace(
        /<div id="toast-container" class="fixed top-4 right-4 z-\[70\] flex flex-col gap-2"/g,
        '<div id="toast-container" class="fixed bottom-6 right-6 z-[70] flex flex-col gap-2"'
    );

    const showToastRegex = /function showToast\(message: string, type: 'error' \| 'success' = 'error'\) \{[\s\S]*?setTimeout\(\(\) => \{ toast\.style\.animation = 'toast-out 0\.3s ease-in forwards'; setTimeout\(\(\) => toast\.remove\(\), 300\); \}, 4000\);\s*\}/;
    const showToastRegex2 = /function showToast\(message: string, type: 'error' \| 'success' = 'error'\) \{[\s\S]*?setTimeout\(\(\) => toast\.remove\(\), 4000\);\s*\}/;

    if (showToastRegex.test(content)) {
        content = content.replace(showToastRegex, showToastNew.trim().replace(/\\\\`/g, '`').replace(/\\\${/g, '${'));
        console.log('Updated regex1 ' + f);
    } else if (showToastRegex2.test(content)) {
        content = content.replace(showToastRegex2, showToastNew.trim().replace(/\\\\`/g, '`').replace(/\\\${/g, '${'));
        console.log('Updated regex2 ' + f);
    }

    fs.writeFileSync(path.join(dir, f), content);
}
