import os
import zipfile
import sys

def create_zip(output_path):
    exclude_dirs = {'node_modules', '.git', '.aistudio', 'dist', '__pycache__', '.vite'}
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file in {'.DS_Store'} or file.endswith('.zip'):
                    continue
                if file.startswith('.') and file not in {'.dockerignore', '.gitignore', '.env.example'}:
                    continue
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, '.')
                zf.write(filepath, arcname)

if __name__ == '__main__':
    dest = sys.argv[1] if len(sys.argv) > 1 else '/tmp/smp-vaergrafikk-kildekode.zip'
    create_zip(dest)
    print("ZIP_CREATED")
