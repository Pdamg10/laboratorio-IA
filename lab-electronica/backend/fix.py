import re
with open('seed_circuits.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'"position":\s*\{\s*"x":\s*(\d+),\s*"y":\s*(\d+)\s*\}', r'"x": \1, "y": \2', content)
with open('seed_circuits.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
