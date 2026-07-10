import { Module } from "@nestjs/common"

import { FunctionsModule } from "./functions/functions.module"
import { DepartmentsModule } from "./departments/departments.module"
import { UnitsModule } from "./units/units.module"
import { PositionLevelsModule } from "./position-levels/position-levels.module"
import { BandsModule } from "./bands/bands.module"
import { PositionsModule } from "./positions/positions.module"
import { OrgChartModule } from "./org-chart/org-chart.module"

/**
 * Barrel module for the Organizational Structure feature: Function ->
 * Department -> Unit (optional) -> Position, plus the Band lookup and the
 * derived org-chart tree.
 */
@Module({
  imports: [
    FunctionsModule,
    DepartmentsModule,
    UnitsModule,
    PositionLevelsModule,
    BandsModule,
    PositionsModule,
    OrgChartModule,
  ],
  exports: [
    FunctionsModule,
    DepartmentsModule,
    UnitsModule,
    PositionLevelsModule,
    BandsModule,
    PositionsModule,
    OrgChartModule,
  ],
})
export class OrganizationModule {}
