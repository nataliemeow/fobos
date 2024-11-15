print(unpack{1, 2}) --> 1 2 3
print(unpack{
	unpack{1, 8, 8},
	unpack{2, 3, 4}
}) --> 1 2 3 4
print(unpack{
	unpack{1, 2, 3}
}) --> 1 2 3
print(unpack{
	unpack{1, 2},
	[3] = 3
}) --> 1
print(unpack{
	a = 1,
	b = 2,
	3
}) --> 3
