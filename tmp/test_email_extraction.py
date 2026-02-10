#!/usr/bin/env python3
"""Test email extraction logic"""

import re
import unicodedata

def normalize_text(text):
    """Remove diacritics for comparison"""
    if not text:
        return ""
    # Normalize to NFD (decomposed form)
    nfd = unicodedata.normalize('NFD', text)
    # Remove combining characters (diacritics)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

def find_email_for_author(full_text, first_name, last_name):
    """Find email by searching for lines with both names"""
    if not full_text or not first_name or not last_name:
        return ""
    
    lines = full_text.split('\n')
    
    for line in lines:
        line_lower = line.lower()
        norm_line = normalize_text(line_lower)
        
        norm_first = normalize_text(first_name.lower())
        norm_last = normalize_text(last_name.lower())
        
        # Check if this line contains both first and last name
        has_first = norm_first and norm_first in norm_line
        has_last = norm_last and norm_last in norm_line
        
        if has_first and has_last:
            # This line is about this author, extract email from it
            email_match = re.search(r'([a-zA-Z0-9._\-]+@[a-zA-Z0-9.\-]+)', line)
            if email_match:
                print(f"  ✓ Found line: '{line.strip()}'")
                print(f"    Email: {email_match.group(1)}")
                return email_match.group(1).strip()
    
    print(f"  ✗ No line found with both '{first_name}' and '{last_name}'")
    return ""

# Test data
latex_code = """
\author[1]{\fnm{Ludmila} \sur{Verešpejová}}
\author[2]{\fnm{Karel} \sur{Štícha}}
\author[1]{\fnm{Zuzana} \sur{Urbániová}}
\author*[2]{\fnm{Jan} \sur{Kohout}}\email{jan.kohout@vscht.cz}
\author[2,3]{\fnm{Jan} \sur{Mareš}}
\author[1]{\fnm{Martin} \sur{Chovanec}}

% Mr.	Alan Spark	alan.spark@vscht.cz	0000-0002-5112-4842	Czech Republic
% Mr.	Karel Štícha	karel.sticha@vscht.cz	0000-0003-0518-4702	Czech Republic
% Mr.	Jan Kohout	jan.kohout@vscht.cz	0000-0003-1591-2777	Czech Republic
% Mrs.	Ludmila Verešpejová	ludmila.verespejova@fnkv.cz	0000-0001-6314-8000	Czech Republic
% Mr.	Martin Chovanec	martin.chovanec@fnkv.cz 	0000-0001-9087-0269	Czech Republic
% Mr.	Jan Mareš	jan.mares@vscht.cz	0000-0003-4693-2519	Czech Republic
"""

authors = [
    ("Ludmila", "Verešpejová"),
    ("Karel", "Štícha"),
    ("Zuzana", "Urbániová"),
    ("Jan", "Kohout"),
    ("Jan", "Mareš"),
    ("Martin", "Chovanec"),
]

print("="*60)
print("TESTING EMAIL EXTRACTION")
print("="*60)

for first, last in authors:
    print(f"\nSearching for: {first} {last}")
    email = find_email_for_author(latex_code, first, last)
    print(f"  Result: {email if email else '(empty)'}")
