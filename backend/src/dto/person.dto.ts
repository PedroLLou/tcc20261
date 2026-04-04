import { ApiProperty } from '@nestjs/swagger';

export class PersonDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  age!: number;
}
