import os
import re

dir_path = r'C:\Users\joaqu\Desktop\DAM\2DAM\Proyectos\VIDEOMARKETING SEVILLA\src\pages\admin'

new_modal = """<!-- Delete Confirmation Modal -->
<div id="confirm-overlay" class="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[60] hidden flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden" style="animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding: 2rem 1.5rem 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(225,29,72,0.1); border: 1px solid rgba(225,29,72,0.2); display: flex; justify-content: center; align-items: center; margin-bottom: 1.25rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;">¿Eliminar permanentemente?</h3>
            <p style="font-size: 0.875rem; color: #a1a1aa; line-height: 1.4; margin: 0;">Esta acción no se puede deshacer. Los datos serán borrados del sistema.</p>
        </div>
        <div style="display: flex; border-top: 1px solid #27272a; padding: 1rem; gap: 0.75rem; background: #09090b;">
            <button id="confirm-cancel" style="flex: 1; padding: 0.75rem; border-radius: 12px; background: #27272a; color: #e4e4e7; font-weight: 500; font-size: 0.9rem; border: 1px solid #3f3f46; cursor: pointer;">Cancelar</button>
            <button id="confirm-yes" style="flex: 1; padding: 0.75rem; border-radius: 12px; background: #e11d48; color: #fff; font-weight: 600; font-size: 0.9rem; border: 1px solid #be123c; cursor: pointer; box-shadow: 0 4px 12px rgba(225,29,72,0.3);">Eliminar</button>
        </div>
    </div>
</div>"""

for filename in os.listdir(dir_path):
    if filename.endswith(".astro"):
        filepath = os.path.join(dir_path, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # The modal contains slightly different paddings in each file sometimes.
        # But it always begins with <!-- Delete Confirmation Modal -->
        # and ends with <!-- Toast Container --> (or similar).
        # We can regex it out explicitly!
        
        # We find the string from <!-- Delete Confirmation Modal --> up to just before <!-- Toast Container --> or <script>
        pattern = r"<!-- Delete Confirmation Modal -->.*?</div>\s*</div>"
        
        if re.search(pattern, content, flags=re.DOTALL):
            content = re.sub(pattern, new_modal, content, flags=re.DOTALL)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Updated " + filepath)
