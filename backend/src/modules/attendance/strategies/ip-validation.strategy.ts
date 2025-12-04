import { Injectable } from '@nestjs/common';

@Injectable()
export class IpValidationStrategy {
  validate(ip: string, allowList: any): boolean {
    if (!allowList || !Array.isArray(allowList) || allowList.length === 0) {
      return true;
    }

    const allowedIps = allowList as string[];
    
    // Handle IPv6 mapped IPv4 addresses (e.g., ::ffff:192.168.1.1)
    const cleanIp = ip.replace(/^::ffff:/, '');

    for (const allowed of allowedIps) {
      if (allowed.includes('/')) {
        if (this.checkCidr(cleanIp, allowed)) {
          return true;
        }
      } else {
        if (allowed === cleanIp) {
          return true;
        }
      }
    }

    return false;
  }

  private checkCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      
      const ipInt = this.ipToInt(ip);
      const rangeInt = this.ipToInt(range);

      return (ipInt & mask) === (rangeInt & mask);
    } catch (e) {
      console.error('Invalid CIDR or IP', e);
      return false;
    }
  }

  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
  }
}
