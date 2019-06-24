#!/usr/bin/python3

from tkinter import Tk, Label, Button, OptionMenu, StringVar, filedialog
from subprocess import check_output
from re import compile
from os.path import dirname, realpath

class CustomButton(Button):
	def __init__(self, master, **kw):
		Button.__init__(self, master=master, **kw)
		self.defaultBackground = self["background"]
		self.defaultForeground = self["foreground"]
		self.bind("<Enter>", self._on_enter)
		self.bind("<Leave>", self._on_leave)

	def _on_enter(self, e):
		self['background'] = self['activebackground']
		self['foreground'] = self['activeforeground']

	def _on_leave(self, e):
		self['background'] = self.defaultBackground
		self['foreground'] = self.defaultForeground

def escape_ansi(line):
	ansi_escape = compile(r'(\x9B|\x1B\[)[0-?]*[ -/]*[@-~]')
	return ansi_escape.sub('', line)

filename = "..."
def get_filename():
	global filename
	global label
	filename = filedialog.askopenfilename(
		initialdir = "/home/",
		title = "Select file",
		filetypes = (
			("csv files","*.csv"),
			("all files","*.*")
		)
	)
	if not filename: filename = "..."
	label["text"] = filename

def upload():
	global root
	global status_label

	if filename == "...": return

	fail_ids = []

	js_file = "/users.js"

	print(menu_var.get())
	if menu_var.get() == "Books":
		js_file = "/books.js"

	with open(filename) as f:
		for i, _ in enumerate(f): pass

	status_label["text"] = "Ingesting %d items..." % i
	root.update()

	log = escape_ansi(check_output(["/usr/bin/node", dirname(realpath(__file__)) + js_file, filename]).decode("utf-8"))

	for line in filter(lambda x: len(x), log.split('\n')):
		print("\n" + line)

		can_connect = True

		words = line.split(' ')
		if words[0] == '[ERROR]':
			if 'ECONNREFUSED' in words:
				can_connect = False
				break
			else:
				fail_ids.append(words[5][1:-2])
				print('An error occurred: ' + ' '.join(words[1:]))
		elif words[0] == '[SUCCESS]':
			if words[1] == 'Updated':
				print('Entry updated, id ' + words[-1])
			elif words[1] == 'Added':
				print('Entry added, id ' + words[-1])
		else:
			print("Unknown error, output is " + ''.join(words[1:]))
			print("At this point, you should probably just buy a proper system...")

	if can_connect:
		if len(fail_ids):
			status_label["foreground"] = "red"
			if len(fail_ids) - 1: err_str = "ERROR, ID: " + ', '.join(fail_ids)
			else: err_str = "ERROR, ID " + fail_ids[0]
			status_label["text"] = err_str
		else:
			status_label["foreground"] = "green"
			status_label["text"] = "SUCCESS"
	else:
		status_label["foreground"] = "red"
		status_label["text"] = "CANNOT CONNECT TO SERVER"


root = Tk()
root.resizable(False, False)
root["bg"] = "white"

menu_var = StringVar(root)
menu_var.set("Users")

root.title("Apollo Data Ingest")

label = Label(root, text="...", bg="#e8e8e8", font=("Arial", "16"), width=30, borderwidth=5, anchor="w")
label.grid(row=0, column=0, columnspan=2, padx=(10, 10), pady=(5, 0))

select_button = CustomButton(root, text="Select File", command=get_filename, bg="#e44d95", fg="white", font=("Arial", "16"), width=10, relief="flat", activebackground="#e44d95", activeforeground="#e8e8e8")
select_button.grid(row=0, column=2, padx=(0, 10), pady=(5, 0), sticky="W")

cancel_button = CustomButton(root, text="Cancel", command=root.destroy, bg="#9b9b9b", fg="white", font=("Arial", "16"), relief="flat", activebackground="#9b9b9b", activeforeground="#e8e8e8")
cancel_button.grid(row=1, column=1, padx=(0, 10), pady=(10, 0), sticky="E")

upload_button = CustomButton(root, text="Upload", command=upload, bg="#e44d95", fg="white", font=("Arial", "16"), width=10, relief="flat", activebackground="#e44d95", activeforeground="#e8e8e8")
upload_button.grid(row=1, column=2, padx=(0, 10), pady=(10, 0), sticky="W")

menu = OptionMenu(root, menu_var, "Users", "Books")
menu.config(bg="white", fg="black", font=("Arial", "16"), relief="flat", width=10, anchor="w")
menu.grid(row=1, column=0, padx=(10, 0), pady=(10, 0), sticky="W")

dropdown = menu.nametowidget(menu.menuname)
dropdown.config(bg="white", relief="flat", font=("Arial", "14"))

status_label = Label(root, text="", bg="white", fg="black", font=("Arial", "18"))
status_label.grid(row=2, columnspan=3, pady=(10, 5))

root.mainloop()
