import os
import re

dir_path = r'C:\Users\joaqu\Desktop\DAM\2DAM\Proyectos\VIDEOMARKETING SEVILLA\src\pages\admin'

new_fn_success_error = """        function showToast(message: string, type: 'error' | 'success' = 'error') {
            const container = document.getElementById('toast-container')!;
            const toast = document.createElement('div');
            toast.className = `flex items-center shadow-2xl font-semibold pointer-events-auto ${
                type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'
            }`;
            toast.style.cssText = 'padding: 16px 24px; gap: 16px; border-radius: 16px; font-size: 16px; animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);';
            if (type === 'success') {
                toast.innerHTML = `<div class="bg-white/20 p-1.5 rounded-full flex items-center justify-center"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div><span>${message}</span>`;
            } else {
                toast.innerHTML = `<div class="bg-white/20 p-1.5 rounded-full flex items-center justify-center"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div><span>${message}</span>`;
            }
            container.appendChild(toast);
            setTimeout(() => { toast.style.animation = 'toast-out 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
        }"""

new_fn_success_error_arrow = """            const showToast = (msg: string, type: 'success'|'error') => {
                const container = document.getElementById('toast-container')!;
                const toast = document.createElement('div');
                toast.className = `flex items-center shadow-2xl font-semibold pointer-events-auto ${type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'}`;
                toast.style.cssText = 'padding: 16px 24px; gap: 16px; border-radius: 16px; font-size: 16px; animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);';
                
                if (type === 'success') {
                    toast.innerHTML = `<div class="bg-white/20 p-1.5 rounded-full flex items-center justify-center"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div><span>${msg}</span>`;
                } else {
                    toast.innerHTML = `<div class="bg-white/20 p-1.5 rounded-full flex items-center justify-center"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div><span>${msg}</span>`;
                }
                
                container.appendChild(toast);
                setTimeout(() => { toast.style.animation = 'toast-out 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
            };"""

for filename in os.listdir(dir_path):
    if filename.endswith(".astro"):
        filepath = os.path.join(dir_path, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if filename == 'ajustes.astro':
            # Replace the arrow function one in ajustes.astro
            content = re.sub(
                r"const showToast = \(msg: string, type: 'success'\|'error'\) => \{.*?setTimeout\(\(\) => \{ toast\.style\.animation = 'toast-out 0\.3s ease-in forwards'; setTimeout\(\(\) => toast\.remove\(\), 300\); \}, 4000\);\s*\};",
                new_fn_success_error_arrow,
                content,
                flags=re.DOTALL
            )
        else:
            # Replace the normal function body
            content = re.sub(
                r"function showToast\(message: string, type: 'error' \| 'success' = 'error'\) \{.*?setTimeout\(\(\) => \{ toast\.style\.animation = 'toast-out 0\.3s ease-in forwards'; setTimeout\(\(\) => toast\.remove\(\), 300\); \}, 4000\);\s*\}",
                new_fn_success_error,
                content,
                flags=re.DOTALL
            )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated " + filepath)
