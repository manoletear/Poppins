import { NextRequest, NextResponse } from 'next/server';
import { getBukSDK } from '@/lib/buk-sdk';

type OrganizationType = 'departments' | 'cost_centers' | 'roles' | 'companies' | 'locations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as OrganizationType | null;

    if (!type) {
      return NextResponse.json(
        { error: 'type query parameter required (departments|cost_centers|roles|companies|locations)' },
        { status: 400 }
      );
    }

    const sdk = getBukSDK();
    let data: unknown;

    switch (type) {
      case 'departments':
        data = await sdk.organization.listAllDepartments();
        break;
      case 'cost_centers':
        data = await sdk.organization.listAllCostCenters();
        break;
      case 'roles':
        data = await sdk.organization.listAllRoles();
        break;
      case 'companies':
        data = await sdk.organization.listAllCompanies();
        break;
      case 'locations':
        data = await sdk.organization.listAllLocations();
        break;
      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[BUK] Error fetching organization data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de organización' },
      { status: 500 }
    );
  }
}
