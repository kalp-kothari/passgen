files = [
    'src/components/PasswordGenerator.tsx',
    'src/components/PasswordAnalyzer.tsx',
    'src/components/BreachChecker.tsx',
    'src/components/HowItWorks.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Reduce section vertical padding from 6rem (py-24) to 3.5rem/4rem (py-14 sm:py-16)
    content = content.replace('py-24', 'py-14 sm:py-16')

    # Reduce oversized titles
    content = content.replace('text-5xl md:text-6xl', 'text-3xl sm:text-4xl md:text-5xl')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Adjusted spacing and heading size in {file}')
