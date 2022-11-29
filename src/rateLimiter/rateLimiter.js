export class RateLimiter {
	constructor(rateLimits) {
		this.rateLimits = rateLimits;
		this.active = {};
	}

	check(ip, target) {
		const now = new Date().getTime();
		if (!(target in this.rateLimits)) {
			return true;
		}
		if (!(ip in this.active)) {
			this.active[ip] = {};
		}
		if (!(target in this.active[ip])) {
			this.active[ip][target] = [];
		}
		let records = this.active[ip][target];
		let index = records.length;
		let result;
		while (--index > 0) {
			const ts = records[index];
			if (now - ts > this.rateLimits[target].window) {
				break;
			}
		}
		records = records.slice(index);
		result = records.length <= this.rateLimits[target].max ? true : false;
		records.push(now);
		this.active[ip][target] = records;
		console.log(records);
		return result;
	}
}

function parseWindow(rawWindow) {
	let windowVal = parseInt(rawWindow) || 1;
	let windowUnit;
	if (windowVal < 1) {
		throw new Error('Invalid window format');
	}
	if (rawWindow.includes('s')) {
		return windowVal * 1000;
	} else if (rawWindow.includes('m')) {
		return windowVal * 60000;
	} else if (rawWindow.includes('h')) {
		return windowVal * 3600000;
	} else if (rawWindow.includes('d')) {
		return windowVal * 86400000;
	} else {
		throw new Error('Invalid window format');
	}
}

export function buildRateLimiter(rawRateLimits) {
	const rateLimits = {};
	for (const query in rawRateLimits) {
		const [max, window] = rawRateLimits[query].split('/');
		rateLimits[query] = { max: max, window: parseWindow(window) };
	}
	return new RateLimiter(rateLimits);
}
