const introspecFields = ['__schema', '__type', '__typename'];

export const validatePermissions = function (permissions, requested, opt) {
	const errors = [];
	const introspection = 'introspection' in opt ? opt.introspection : true;
	for (const object in requested.scopes) {
		if (object in permissions) {
			for (const field in requested.scopes[object]) {
				if (!permissions[object].includes(field)) {
					if (introspection === true && introspecFields.includes(field)) {
						continue;
					}
					errors.push(`${object}.${field}`);
				}
			}
		} else {
			errors.push(`${object}.*`);
		}
	}
	return errors;
};

// const permissions = {
// 	Mutation: ['signin', 'signup', 'logout', 'manage', 'dothat'],
// }
