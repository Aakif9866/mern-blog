import os

def print_tree(start, indent=""):
    for item in sorted(os.listdir(start)):
        path = os.path.join(start, item)
        print(indent + "|-- " + item)
        if os.path.isdir(path):
            print_tree(path, indent + "    ")

print_tree(".")