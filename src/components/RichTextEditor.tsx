"use client"; 
 
 import { useEditor, EditorContent } from "@tiptap/react"; 
 import { StarterKit } from "@tiptap/starter-kit"; 
 import { Underline } from "@tiptap/extension-underline"; 
 import { TextStyle } from "@tiptap/extension-text-style"; 
 import { useEffect } from "react"; 
 
 type Props = { 
   value: string; // HTML string 
   onChange: (html: string) => void; 
   placeholder?: string; 
 }; 
 
 function ToolbarButton({ 
   onClick, 
   active, 
   title, 
   children, 
 }: { 
   onClick: () => void; 
   active?: boolean; 
   title: string; 
   children: React.ReactNode; 
 }) { 
   return ( 
     <button 
       type="button" 
       title={title} 
       onClick={onClick} 
       className={`rounded px-2 py-1 text-xs transition ${ 
         active 
           ? "bg-[#7c83ff] text-white" 
           : "text-gray-400 hover:bg-white/10 hover:text-white" 
       }`} 
     > 
       {children} 
     </button> 
   ); 
 } 
 
 const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "40", "48"]; 
 
 export function RichTextEditor({ value, onChange, placeholder }: Props) { 
   const editor = useEditor({ 
     extensions: [ 
       StarterKit, 
       Underline, 
       TextStyle, 
     ], 
     content: value || "", 
     immediatelyRender: false, 
     onUpdate({ editor }) { 
       onChange(editor.getHTML()); 
     }, 
     editorProps: { 
       attributes: { 
         class: 
           "min-h-[80px] w-full rounded-b-xl border-x border-b border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#7c83ff]", 
       }, 
     }, 
   }); 
 
   // Sincronizar si el value cambia desde afuera 
   useEffect(() => { 
     if (!editor) return; 
     if (editor.getHTML() !== value) { 
       editor.commands.setContent(value || ""); 
     } 
   }, [value]); 
 
   if (!editor) return null; 
 
   return ( 
     <div className="relative"> 
       {/* Toolbar */} 
       <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-white/10 bg-[#13172a] px-2 py-1.5"> 
         <ToolbarButton 
           title="Negrita" 
           onClick={() => editor.chain().focus().toggleBold().run()} 
           active={editor.isActive("bold")} 
         > 
           <strong>B</strong> 
         </ToolbarButton> 
 
         <ToolbarButton 
           title="Cursiva" 
           onClick={() => editor.chain().focus().toggleItalic().run()} 
           active={editor.isActive("italic")} 
         > 
           <em>I</em> 
         </ToolbarButton> 
 
         <ToolbarButton 
           title="Subrayado" 
           onClick={() => editor.chain().focus().toggleUnderline().run()} 
           active={editor.isActive("underline")} 
         > 
           <span style={{ textDecoration: "underline" }}>U</span> 
         </ToolbarButton> 
 
         <ToolbarButton 
           title="Tachado" 
           onClick={() => editor.chain().focus().toggleStrike().run()} 
           active={editor.isActive("strike")} 
         > 
           <span style={{ textDecoration: "line-through" }}>S</span> 
         </ToolbarButton> 
 
         <div className="mx-1 h-4 w-px bg-white/10" /> 
 
         <ToolbarButton 
           title="Lista con viñetas" 
           onClick={() => editor.chain().focus().toggleBulletList().run()} 
           active={editor.isActive("bulletList")} 
         > 
           ≡ 
         </ToolbarButton> 
 
         <ToolbarButton 
           title="Lista numerada" 
           onClick={() => editor.chain().focus().toggleOrderedList().run()} 
           active={editor.isActive("orderedList")} 
         > 
           1. 
         </ToolbarButton> 
 
         <div className="mx-1 h-4 w-px bg-white/10" /> 
 
         {/* Tamaño de texto */} 
         <select 
           title="Tamaño de texto" 
           onChange={(e) => { 
             const size = e.target.value; 
             if (size === "default") { 
               editor.chain().focus().unsetMark("textStyle").run(); 
             } else { 
               editor.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run(); 
             } 
           }} 
           className="rounded bg-white/5 px-1 py-0.5 text-xs text-gray-300 outline-none" 
           defaultValue="default" 
         > 
           <option value="default">Tamaño</option> 
           {FONT_SIZES.map((s) => ( 
             <option key={s} value={s}>{s}px</option> 
           ))} 
         </select> 
 
         <div className="mx-1 h-4 w-px bg-white/10" /> 
 
         <ToolbarButton 
           title="Limpiar formato" 
           onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} 
         > 
           ✕ fmt 
         </ToolbarButton> 
       </div> 
 
       <EditorContent editor={editor} /> 
 
       {!editor.getText() && placeholder ? ( 
         <div className="pointer-events-none absolute left-3 top-[42px] text-sm text-gray-600"> 
           {placeholder} 
         </div> 
       ) : null} 
     </div> 
   ); 
 } 
