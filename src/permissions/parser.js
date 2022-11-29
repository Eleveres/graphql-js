const mapArgumentsValues = function (args, variables) {
	if (typeof variables !== 'undefined') {
		for (let obj in args) {
			for (let argument of args[obj]) {
				if (argument.kind === 'Variable') {
					if (argument.value in variables) {
						argument.value = variables[argument.value];
					}
				}
				delete argument.kind;
			}
		}
	}
};

const parseObjectArgs = function (args, type, reqArgs) {
	if (!(type in reqArgs)) {
		reqArgs[type] = [];
	}
	for (let argument of args) {
		if (argument.value.kind === 'Variable') {
			reqArgs[type].push({
				kind: argument.value.kind,
				name: argument.name.value,
				value: argument.value.name.value,
			});
		} else {
			reqArgs[type].push({
				kind: argument.kind,
				name: argument.name.value,
				value:
					argument.value.kind !== 'IntValue'
						? argument.value.value
						: Number(argument.value.value),
			});
		}
	}
};

function parseObjectScopes(document, schema, type, parsed, path) {
	/* 
		Document simplified structure:
		{
			name: users,
			selections: [document, document, ...]
		}
		
		Schema type map simplified structure:
		{
			name: Query,
			fields: {
				users: {
					name,
					type: {
						ofType {
							name,
							fields
						}
					}
				}
			}
		}
		
		Current document has to be a field of current schema type.
		If current document is an object (has selectionSet) we call the function
		with the type of the field document is in schema and the next field of 
		the current document.
	*/
	if (type === null) {
		return;
	}
	if (
		'selectionSet' in document &&
		typeof document.selectionSet !== 'undefined'
	) {
		if (!(type in parsed.scopes)) {
			parsed.scopes[type] = {};
		}
		if (
			'arguments' in document &&
			typeof document.argument != undefined &&
			document.arguments.length > 0
		) {
			parseObjectArgs(document.arguments, type, parsed.args);
		}
		document.selectionSet.selections.forEach((selection, i) => {
			let currentPath = path + `.selectionSet.selections.0${i}`;
			if (selection.kind === 'InlineFragment') {
				parseObjectScopes(
					selection,
					schema,
					selection.typeCondition.name.value,
					parsed,
					currentPath,
				);
			} else {
				if (selection.name.value in parsed.scopes[type]) {
					parsed.scopes[type][selection.name.value].references.push(
						currentPath,
					);
				} else {
					parsed.scopes[type][selection.name.value] = {
						references: [currentPath],
					};
				}
				if (selection.name.value in schema._typeMap[type]._fields) {
					let nextType =
						schema._typeMap[type]._fields[selection.name.value].type;
					while ('ofType' in nextType) {
						nextType = nextType.ofType;
					}
					parseObjectScopes(
						selection,
						schema,
						nextType.name,
						parsed,
						currentPath,
					);
				}
			}
		});
	}
}

const getRootTypeName = function (document, schema) {
	if (
		document.operation === 'query' &&
		typeof schema._queryType !== 'undefined'
	) {
		return schema._queryType.name;
	}
	if (
		document.operation === 'mutation' &&
		typeof schema._mutationType !== 'undefined'
	) {
		return schema._mutationType.name;
	}
	if (
		document.operation === 'subscription' &&
		typeof schema._subscriptionType !== 'undefined'
	) {
		return schema._subscriptionType.name;
	}
	return null;
};

function getDefinition(document, operationName) {
	for (const [index, def] of document.definitions.entries()) {
		if (def.name !== undefined && def.name.value === operationName) {
			return index;
		}
	}
	return 0;
}

export function parseScopes(document, schema, operationName, variables) {
	const requestedScopes = { scopes: {}, args: {} };
	const definitionIndex = getDefinition(document, operationName);
	let path = `definitions.0${definitionIndex}`;

	parseObjectScopes(
		document.definitions[definitionIndex],
		schema,
		getRootTypeName(document.definitions[definitionIndex], schema),
		requestedScopes,
		path,
	);
	mapArgumentsValues(requestedScopes.args, variables);
	return requestedScopes;
}
