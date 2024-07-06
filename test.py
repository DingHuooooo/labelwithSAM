import os

def rename_files(dir_path):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            file_path = os.path.join(root, file)
            if os.path.isfile(file_path):  # 只处理文件而非目录
                base_name, ext = os.path.splitext(file)
                if ext != '' and ext.lower() in ['.png', '.jpg', '.jpeg', '.gif']:  # 确认文件扩展名
                    new_name = base_name + '_wear' + ext
                    new_path = os.path.join(root, new_name)
                    os.rename(file_path, new_path)
                    print(f'Renamed {file_path} to {new_path}')

if __name__ == '__main__':
    directory_path = r'C:\Users\dingh\Desktop\web_label_tool\data\points'  # 替换为实际的目录路径
    rename_files(directory_path)
