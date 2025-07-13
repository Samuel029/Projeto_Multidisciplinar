import json
import math
from datetime import datetime
from flask import session
from backend.extensions import db
from backend.models import User, Post, Comment, Like

class ProgressTracker:
    # Defina todas as páginas do seu site
    PAGES = {
        'telainicial': 'Tela Inicial',
        'videos': 'Vídeos e Tutoriais',
        'materiais': 'Materiais de Estudo',
        'pdfs': 'PDFs e Apostilas',
        'codigo': 'Exemplos de Código',
        'comunidade': 'Comunidade',
        'configuracoes': 'Configurações'
    }
    
    # Páginas que contam como recursos
    RESOURCE_PAGES = {
        'videos': 'Vídeos e Tutoriais',
        'materiais': 'Materiais de Estudo',
        'pdfs': 'PDFs e Apostilas',
        'codigo': 'Exemplos de Código'
    }
    
    # Pesos para diferentes atividades
    ACTIVITY_WEIGHTS = {
        'page_visit': 5,
        'post_created': 15,
        'comment_created': 10,
        'like_given': 3,
        'profile_updated': 8
    }
    
    @staticmethod
    def track_page_visit(user_id, page_name):
        """Registra a visita a uma página"""
        if not user_id or page_name not in ProgressTracker.PAGES:
            return
        
        user = db.session.get(User, user_id)
        if not user:
            return
        
        # Atualizar páginas visitadas
        try:
            visited_pages = json.loads(user.visited_pages) if user.visited_pages else {}
        except (json.JSONDecodeError, TypeError):
            visited_pages = {}
        
        visited_pages[page_name] = datetime.now().isoformat()
        user.visited_pages = json.dumps(visited_pages)
        user.last_activity = datetime.utcnow()
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao rastrear visita da página: {str(e)}")
    
    @staticmethod
    def calculate_resources_count(user_id):
        """Calcula o número de recursos acessados pelo usuário"""
        try:
            user = db.session.get(User, user_id)
            if not user:
                return 0
            
            # Obter páginas visitadas
            try:
                visited_pages = json.loads(user.visited_pages) if user.visited_pages else {}
            except (json.JSONDecodeError, TypeError):
                visited_pages = {}
            
            # Contar apenas páginas que são recursos
            resources_accessed = sum(1 for page_key in visited_pages.keys() 
                                   if page_key in ProgressTracker.RESOURCE_PAGES)
            
            return resources_accessed
            
        except Exception as e:
            print(f"Erro ao calcular resources_count: {str(e)}")
            return 0
    
    @staticmethod
    def calculate_progress(user_id):
        """Calcula o progresso total do usuário"""
        try:
            user = db.session.get(User, user_id)
            if not user:
                return {
                    'progress_percentage': 0,
                    'activity_points': 0,
                    'resources_count': 0,
                    'details': {
                        'posts_count': 0,
                        'comments_count': 0,
                        'likes_count': 0,
                        'pages_visited': 0,
                        'total_pages': len(ProgressTracker.PAGES),
                        'resources_accessed': 0,
                        'total_resources': len(ProgressTracker.RESOURCE_PAGES),
                        'visited_pages': {},
                        'pages_info': ProgressTracker.PAGES
                    }
                }
            
            # Calcular pontos de atividades com tratamento de erro
            try:
                posts_count = Post.query.filter_by(user_id=user.id).count() or 0
                comments_count = Comment.query.filter_by(user_id=user.id).count() or 0
                likes_count = Like.query.filter_by(user_id=user.id).count() or 0
            except Exception as e:
                print(f"Erro ao contar atividades: {str(e)}")
                posts_count = comments_count = likes_count = 0
            
            # Calcular páginas visitadas com tratamento de erro
            try:
                visited_pages = json.loads(user.visited_pages) if user.visited_pages else {}
            except (json.JSONDecodeError, TypeError):
                visited_pages = {}
            
            pages_visited = len(visited_pages)
            total_pages = len(ProgressTracker.PAGES)
            
            # Calcular recursos acessados
            resources_count = ProgressTracker.calculate_resources_count(user_id)
            
            # Calcular pontos
            activity_points = (
                posts_count * ProgressTracker.ACTIVITY_WEIGHTS['post_created'] +
                comments_count * ProgressTracker.ACTIVITY_WEIGHTS['comment_created'] +
                likes_count * ProgressTracker.ACTIVITY_WEIGHTS['like_given'] +
                pages_visited * ProgressTracker.ACTIVITY_WEIGHTS['page_visit']
            )
            
            # Garantir que activity_points não seja None ou NaN
            if activity_points is None or math.isnan(activity_points):
                activity_points = 0
            
            # Calcular porcentagem (base 200 pontos para 100%)
            max_points = 200
            if max_points == 0:
                progress_percentage = 0
            else:
                progress_percentage = min((activity_points / max_points) * 100, 100)
            
            # Bonus por completar todas as páginas
            if pages_visited == total_pages and total_pages > 0:
                progress_percentage = min(progress_percentage * 1.2, 100)
            
            # Garantir que progress_percentage não seja None ou NaN
            if progress_percentage is None or math.isnan(progress_percentage):
                progress_percentage = 0
            
            return {
                'progress_percentage': round(float(progress_percentage), 2),
                'activity_points': int(activity_points),
                'resources_count': resources_count,
                'details': {
                    'posts_count': posts_count,
                    'comments_count': comments_count,
                    'likes_count': likes_count,
                    'pages_visited': pages_visited,
                    'total_pages': total_pages,
                    'resources_accessed': resources_count,
                    'total_resources': len(ProgressTracker.RESOURCE_PAGES),
                    'visited_pages': visited_pages,
                    'pages_info': ProgressTracker.PAGES,
                    'resource_pages_info': ProgressTracker.RESOURCE_PAGES
                }
            }
            
        except Exception as e:
            print(f"Erro geral em calculate_progress: {str(e)}")
            return {
                'progress_percentage': 0,
                'activity_points': 0,
                'resources_count': 0,
                'details': {
                    'posts_count': 0,
                    'comments_count': 0,
                    'likes_count': 0,
                    'pages_visited': 0,
                    'total_pages': len(ProgressTracker.PAGES),
                    'resources_accessed': 0,
                    'total_resources': len(ProgressTracker.RESOURCE_PAGES),
                    'visited_pages': {},
                    'pages_info': ProgressTracker.PAGES,
                    'resource_pages_info': ProgressTracker.RESOURCE_PAGES
                }
            }
    
    @staticmethod
    def get_next_actions(user_id):
        """Sugere próximas ações para o usuário"""
        try:
            progress_data = ProgressTracker.calculate_progress(user_id)
            suggestions = []
            
            details = progress_data.get('details', {})
            visited_pages = details.get('visited_pages', {})
            
            # Sugerir recursos não acessados primeiro
            for page_key, page_name in ProgressTracker.RESOURCE_PAGES.items():
                if page_key not in visited_pages:
                    suggestions.append(f"Explore os recursos: {page_name}")
            
            # Sugerir outras páginas não visitadas
            for page_key, page_name in ProgressTracker.PAGES.items():
                if page_key not in visited_pages and page_key not in ProgressTracker.RESOURCE_PAGES:
                    suggestions.append(f"Visite a página: {page_name}")
            
            # Sugerir atividades baseadas no que falta
            posts_count = details.get('posts_count', 0)
            comments_count = details.get('comments_count', 0)
            likes_count = details.get('likes_count', 0)
            
            if posts_count == 0:
                suggestions.append("Crie seu primeiro post na comunidade")
            elif posts_count < 3:
                suggestions.append("Crie mais posts para aumentar sua participação")
            
            if comments_count == 0:
                suggestions.append("Comente em algum post da comunidade")
            elif comments_count < 5:
                suggestions.append("Participe mais das discussões comentando em posts")
            
            if likes_count < 10:
                suggestions.append("Curta posts e comentários que você gostar")
            
            return suggestions[:3]  # Retornar apenas 3 sugestões
            
        except Exception as e:
            print(f"Erro em get_next_actions: {str(e)}")
            return ["Explore o site e participe da comunidade"]
    
    @staticmethod
    def get_user_stats(user_id):
        """Retorna estatísticas detalhadas do usuário"""
        try:
            progress_data = ProgressTracker.calculate_progress(user_id)
            details = progress_data.get('details', {})
            
            return {
                'total_progress': progress_data.get('progress_percentage', 0),
                'activity_points': progress_data.get('activity_points', 0),
                'resources_count': progress_data.get('resources_count', 0),
                'pages_completion': f"{details.get('pages_visited', 0)}/{details.get('total_pages', 0)}",
                'resources_completion': f"{details.get('resources_accessed', 0)}/{details.get('total_resources', 0)}",
                'engagement_score': min(
                    (details.get('posts_count', 0) * 3 + 
                     details.get('comments_count', 0) * 2 + 
                     details.get('likes_count', 0)) / 10 * 100, 100
                ),
                'activity_breakdown': {
                    'posts': details.get('posts_count', 0),
                    'comments': details.get('comments_count', 0),
                    'likes': details.get('likes_count', 0),
                    'pages_visited': details.get('pages_visited', 0),
                    'resources_accessed': details.get('resources_accessed', 0)
                }
            }
        except Exception as e:
            print(f"Erro em get_user_stats: {str(e)}")
            return {
                'total_progress': 0,
                'activity_points': 0,
                'resources_count': 0,
                'pages_completion': "0/0",
                'resources_completion': "0/0",
                'engagement_score': 0,
                'activity_breakdown': {
                    'posts': 0,
                    'comments': 0,
                    'likes': 0,
                    'pages_visited': 0,
                    'resources_accessed': 0
                }
            }