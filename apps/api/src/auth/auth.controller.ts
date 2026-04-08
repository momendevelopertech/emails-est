import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getCookieSettings } from '../shared/cookie-settings';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookieAges(rememberMe = false) {
    const accessMs = 15 * 60 * 1000;
    const refreshMs = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    return { accessMs, refreshMs };
  }

  private getHttpOnlyCookieOptions(maxAge: number): CookieOptions {
    const { sameSite, secure, domain, path } = getCookieSettings();
    return { httpOnly: true, secure, sameSite, maxAge, path, ...(domain ? { domain } : {}) };
  }

  private getSessionHintCookieOptions(maxAge?: number): CookieOptions {
    const { sameSite, secure, domain, path } = getCookieSettings();
    return { httpOnly: false, secure, sameSite, path, ...(typeof maxAge === 'number' ? { maxAge } : {}), ...(domain ? { domain } : {}) };
  }

  private getClearCookieOptions(): CookieOptions {
    const { sameSite, secure, domain, path } = getCookieSettings();
    return { httpOnly: true, secure, sameSite, path, ...(domain ? { domain } : {}) };
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const rememberMe = !!dto.rememberMe;
    const result = await this.authService.login(dto.identifier, dto.password, rememberMe);
    const ages = this.getCookieAges(rememberMe);
    res.cookie('access_token', result.accessToken, this.getHttpOnlyCookieOptions(ages.accessMs));
    res.cookie('refresh_token', result.refreshToken, this.getHttpOnlyCookieOptions(ages.refreshMs));
    res.cookie('sphinx_session', '1', this.getSessionHintCookieOptions(ages.refreshMs));
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout((req as any).user?.id, req.cookies?.refresh_token);
    const clearCookieOptions = this.getClearCookieOptions();
    res.clearCookie('access_token', clearCookieOptions);
    res.clearCookie('refresh_token', clearCookieOptions);
    res.clearCookie('remember_me', clearCookieOptions);
    res.clearCookie('sphinx_session', this.getSessionHintCookieOptions());
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rememberMe = req.cookies?.remember_me === '1';
    const tokens = await this.authService.refreshTokens(req.cookies?.refresh_token, rememberMe);
    const ages = this.getCookieAges(rememberMe);
    res.cookie('access_token', tokens.accessToken, this.getHttpOnlyCookieOptions(ages.accessMs));
    res.cookie('refresh_token', tokens.refreshToken, this.getHttpOnlyCookieOptions(ages.refreshMs));
    res.cookie('sphinx_session', '1', this.getSessionHintCookieOptions(ages.refreshMs));
    return { accessToken: tokens.accessToken };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.authService.changePassword((req as any).user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = (req as any).user;
    return { id: user.id, email: user.email, username: user.username, fullName: user.fullName, role: user.role, phone: user.phone };
  }

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request) {
    const token = (req as Request & { csrfToken: () => string }).csrfToken();
    return { csrfToken: token };
  }
}
